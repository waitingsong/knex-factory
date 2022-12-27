import assert from 'node:assert'

import {
  Config as _Config,
  Controller,
  Get,
  Inject,
} from '@midwayjs/core'
import type { Context } from '@mwcp/share'

import { Transactional } from '~/index'
import { apiPrefix, apiRoute } from '../api-route'
import { UserService3 } from './65b.deep.service'


@Controller(apiPrefix.classDecoratorDeep)
export class ClassDecoratorDeepController {

  @Inject() readonly ctx: Context
  @Inject() readonly userSvc3: UserService3

  @Transactional()
  @Get(`/${apiRoute.controllerUpdate}`)
  async controllerUpdate(): Promise<'OK'> {
    await this.userSvc3.userAllWithUpdate()
    return 'OK'
  }

  @Get(`/${apiRoute.seperateTrx}`)
  async serial(): Promise<'OK'> {
    await this.userSvc3.getUsers()
    await this.userSvc3.getUsers2()
    return 'OK'
  }

  @Get(`/${apiRoute.sibling}`)
  async sibling(): Promise<'OK'> {
    await this.userSvc3.userAll2()
    return 'OK'
  }

  @Get(`/${apiRoute.update}`)
  async update(): Promise<'OK'> {
    await this.userSvc3.userAllWithUpdate()
    return 'OK'
  }

  @Get(`/${apiRoute.updateDel}`)
  async updateDel(): Promise<'OK'> {
    await this.userSvc3.userUpdateDel(1, 3)
    return 'OK'
  }

  @Get(`/${apiRoute.updateDelOneByOne}`)
  async siblingUpdateDelOneByOne(): Promise<'OK'> {
    await this.userSvc3.userUpdateDel(1, 3)
    await this.userSvc3.userUpdateDel(2, 2)
    await this.userSvc3.userUpdateDel(3, 1)
    return 'OK'
  }

  @Get(`/${apiRoute.controllerUpdateDelOneByOne}`)
  async controllerSiblingUpdateDelOneByOne(): Promise<'OK'> {
    await this.userSvc3.userUpdateDel(1, 3)
    await this.userSvc3.userUpdateDel(2, 2)
    await this.userSvc3.userUpdateDel(3, 1)
    return 'OK'
  }

  @Get(`/${apiRoute.updateDelAll}`)
  async updateDelAll(): Promise<'OK'> {
    await this.userSvc3.userUpdateDelAll()
    return 'OK'
  }

  @Get(`/${apiRoute.selfUpdateDel}`)
  async selfCalling(): Promise<'OK'> {
    await this.userSvc3.selfUserUpdateDel(1, 3, 3)
    return 'OK'
  }

}

