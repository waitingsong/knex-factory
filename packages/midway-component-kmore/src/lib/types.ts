import { IMidwayWebContext as Context } from '@midwayjs/web'
import { DbDict, KnexConfig } from 'kmore'
import { Knex } from 'knex'
import { Logger } from 'midway-component-jaeger'
import { Span } from 'opentracing'


export type KmoreComponentConfig <DbId extends string = string> = Record<DbId, DbConfig>
export interface DbConfig <T = unknown> {
  /**
   * Auto connect when service onReady
   * @default true
   */
  autoConnect: boolean
  config: KnexConfig
  dict: DbDict<T>
  /**
   * Enable tracing via midway-component-jaeger
   * @default false
   */
  enableTracing: boolean
  /**
   * 强制采样请求处理时间（毫秒）阈值
   * 负数不采样
   */
  sampleThrottleMs: number
}

export interface KmoreComponentFactoryOpts<D> {
  dbConfig: DbConfig<D>
  ctx?: Context
  dbh?: Knex
  dbId?: string
  instanceId?: string | symbol
  logger?: Logger
}

export interface QuerySpanInfo {
  reqId: string
  span: Span
  tagClass: string
  timestamp: number
}
