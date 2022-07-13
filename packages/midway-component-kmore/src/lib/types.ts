import { Logger as JLogger, TracerManager } from '@mw-components/jaeger'
import type { MiddlewareConfig as MWConfig } from '@waiting/shared-types'
import type { KnexConfig } from 'kmore'
import type { DbDict } from 'kmore-types'
import type { Knex } from 'knex'
import type { Span } from 'opentracing'

import type { Context } from '~/interface'


/**
 * KmoreComponentConfig
 */
export interface Config {
  /**
   * @default 200
   * @see https://nodejs.org/dist/latest-v16.x/docs/api/events.html#events_emitter_getmaxlisteners
   */
  defaultMaxListeners?: number
  /**
   * @default 2000
   */
  timeoutWhenDestroy?: number
}

export interface MiddlewareOptions {
  debug: boolean
}
export type MiddlewareConfig = MWConfig<MiddlewareOptions>

export type DbConfigs <DbId extends string = string> = Record<DbId, DbConfig>
export interface DbConfig <T = unknown> {
  /**
   * Auto connect when service onReady
   * @default true
   */
  autoConnect: boolean
  config: KnexConfig
  dict: DbDict<T>
  /**
   * Enable tracing via @mw-components/jaeger
   * @default false
   */
  enableTracing: boolean
  /**
   * Tracing query response (respRaw.response),
   * @default true
   * @description tracing if true of if query cost > sampleThrottleMs
   */
  tracingResponse: boolean
  /**
   * 强制采样请求处理时间（毫秒）阈值
   * 负数不采样
   */
  sampleThrottleMs: number
}

export interface KmoreComponentFactoryOpts<D> {
  ctx: Context
  dbConfig: DbConfig<D>
  dbh?: Knex
  dbId?: string
  instanceId?: string | symbol
  logger?: JLogger | undefined
  tracerManager?: TracerManager | undefined
}

export interface QuerySpanInfo {
  span: Span
  tagClass: string
  timestamp: number
}


