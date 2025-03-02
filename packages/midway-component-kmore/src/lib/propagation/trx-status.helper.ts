import assert from 'node:assert'
import { relative } from 'node:path'

import type { Attributes, Span, TraceService } from '@mwcp/otel'
import { AttrNames } from '@mwcp/otel'
import { getStackCallerSites } from '@waiting/shared-core'
import type {
  KmoreQueryBuilder,
  KmoreTransaction,
  TrxPropagateOptions,
} from 'kmore'
import {
  QueryBuilderExtKey,
  RowLockLevel,
} from 'kmore'

import type {
  CallerKey,
  RegisterTrxPropagateOptions,
  TrxCallerInfo,
} from './trx-status.types.js'


export function genCallerKey(className: string, funcName: string): CallerKey {
  assert(className, 'className is undefined')
  assert(funcName, 'funcName is undefined')
  const name1 = className.trim()
  const name2 = funcName.trim()
  assert(name1, 'className is empty')
  assert(name2, 'funcName is empty')
  const key = `${name1}:${name2}`
  return key
}

export interface TrxTraceOptions {
  type: 'event' | 'tag'
  appDir: string
  traceSvc: TraceService
  /** will rootSpan if undefined  */
  span: Span | undefined
  trxPropagateOptions?: TrxPropagateOptions | RegisterTrxPropagateOptions
  attr?: Attributes
}
export function trxTrace(options: TrxTraceOptions): void {
  const {
    type,
    appDir,
    traceSvc,
    span,
    trxPropagateOptions,
    attr,
  } = options

  if (! span) { return }

  let attrs: Attributes = {}
  if (trxPropagateOptions) {
    const path = 'path' in trxPropagateOptions && trxPropagateOptions.path
      ? relative(appDir, trxPropagateOptions.path).replaceAll('\\', '/')
      : ''
    attrs = {
      [AttrNames.TrxPropagationType]: trxPropagateOptions.type,
      [AttrNames.TrxPropagationClass]: trxPropagateOptions.className,
      [AttrNames.TrxPropagationFunc]: trxPropagateOptions.funcName,
      [AttrNames.TrxPropagationPath]: path,
      // [AttrNames.TrxPropagationReadRowLockLevel]: trxPropagateOptions.readRowLockLevel,
      // [AttrNames.TrxPropagationWriteRowLockLevel]: trxPropagateOptions.writeRowLockLevel,
      ...attr,
    }
  }
  else {
    attrs = {
      ...attr,
    }
  }

  if (type === 'event') {
    traceSvc.addEvent(span, attrs)
  }
  else {
    traceSvc.otel.setAttributesLater(span, attrs)
  }
}


export function getSimpleCallers(limit = 64): TrxCallerInfo[] {
  const ret: TrxCallerInfo[] = []
  const sites = getStackCallerSites(limit)
  sites.forEach((site) => {
    const className = site.getTypeName() ?? ''
    const fileName = site.getFileName() ?? ''

    let funcName = ''
    let methodName = ''
    if (className) {
      funcName = site.getFunctionName() ?? ''
      methodName = site.getMethodName() ?? ''
    }
    const row: TrxCallerInfo = {
      path: fileName,
      className,
      funcName,
      methodName,
      line: -1,
      column: -1,
    }
    ret.push(row)
  })

  return ret
}

const forShareMethods = [
  'first',
  'select',
]
const skipMethods = ['truncate']

export function linkBuilderWithTrx(
  builder: KmoreQueryBuilder,
  trx: KmoreTransaction,
): void {

  assert(trx, 'trx is undefined')

  void builder.transacting(trx)

  const trxPropagateOptions = builder[QueryBuilderExtKey.trxPropagateOptions]
  if (trxPropagateOptions) {
    // @ts-expect-error

    const method = builder._method as string
    if (forShareMethods.includes(method)) {
      // avoid error: "for share - FOR SHARE is not allowed with aggregate functions"
      if (! builderStatementsHasTypeAggregate(builder)) {
        builderRowLock(builder, trxPropagateOptions.readRowLockLevel)
      }
    }
    else if (! skipMethods.includes(method)) {
      builderRowLock(builder, trxPropagateOptions.writeRowLockLevel)
    }
  }

  builder.trxPropagated = true
}

function builderRowLock(
  builder: KmoreQueryBuilder,
  rowLockLevel: RowLockLevel,
): void {

  switch (rowLockLevel) {
    case RowLockLevel.ForShare: {
      void builder.forShare()
      break
    }

    case RowLockLevel.ForUpdate: {
      void builder.forUpdate()
      break
    }

    case RowLockLevel.ForShareSkipLocked: {
      void builder.forShare().skipLocked()
      break
    }

    case RowLockLevel.ForUpdateSkipLocked: {
      void builder.forUpdate().skipLocked()
      break
    }

    default:
      break
  }

  void Object.defineProperty(builder, QueryBuilderExtKey.rowLockLevel, {
    value: rowLockLevel,
  })
}

function builderStatementsHasTypeAggregate(builder: KmoreQueryBuilder): boolean {
  // @ts-expect-error
  const statements = builder._statements as BuilderStatement[] | undefined
  if (! statements?.length) {
    return false
  }

  for (const row of statements) {
    if (row.type === 'aggregate') {
      return true
    }
  }

  return false
}

interface BuilderStatement {
  type: string // aggregate, whereBasic
  aggregate?: boolean
  alias?: string | undefined
  asColumn?: boolean
  bool?: string // and
  column?: string // uid
  groupBy?: string // columns
  grouping?: string // where
  method?: string // count
  operator?: string // =
  not?: boolean
  value: unknown // total: '*'
}
