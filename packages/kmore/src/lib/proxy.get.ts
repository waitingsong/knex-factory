import type { CreateQueryBuilderGetProxyOptions } from './base.js'
import type { KmoreQueryBuilder } from './builder.types.js'
import { defaultPropDescriptor } from './config.js'


export function createQueryBuilderGetProxy(
  options: CreateQueryBuilderGetProxyOptions,
): KmoreQueryBuilder {

  const { kmore, builder, thenHandler, resultPagerHandler } = options

  const ret = new Proxy(builder, {
    get: (target: KmoreQueryBuilder, propKey: string | symbol, receiver: unknown) => {
      switch (propKey) {
        case 'then':
          // return proxyGetThen({ kmore, target, propKey, receiver })
          return thenHandler({ kmore, target, propKey, receiver, resultPagerHandler })
        default:
          return Reflect.get(target, propKey, receiver)
      }
    },
  })
  void Object.defineProperty(ret, 'createQueryBuilderGetProxyKey', {
    ...defaultPropDescriptor,
    value: Date.now(),
  })

  return ret
}

