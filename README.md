# [kmore](https://waitingsong.github.io/kmore/)

A SQL query builder based on [Knex](https://knexjs.org/) with powerful TypeScript type support.


[![GitHub tag](https://img.shields.io/github/tag/waitingsong/kmore.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![](https://img.shields.io/badge/lang-TypeScript-blue.svg)]()
[![ci](https://github.com/waitingsong/kmore/workflows/ci/badge.svg)](https://github.com/waitingsong/kmore/actions)
[![codecov](https://codecov.io/gh/waitingsong/kmore/branch/main/graph/badge.svg?token=wNYqpmseCn)](https://codecov.io/gh/waitingsong/kmore)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)


## Features
- Type-safe property of tables accessor 
- Type-safe join table easily
- Type-safe auto-completion in IDE


## Installation
```sh
npm i kmore && npm i -D kmore-cli
// for Midway.js
npm i @mw-components/kmore && npm i -D kmore-cli

# Then add one of the following:
npm install pg
npm install pg-native
npm install mssql
npm install oracle
npm install sqlite3
```

[pg-native-installation][pg-native]

## Basic usage

### Build configuration:

Edit the `package.json`
```json
{
  "script": {
    "build": "tsc -b && npm run db:gen",
    "db:gen": "kmore gen --path src/ test/",
    "db:gen-cjs": "kmore gen --path src/ test/ --format cjs"
  },
}
```

### Create connection
```ts
import { KnexConfig, kmoreFactory, genDbDict } from 'kmore'

// connection config
export const config: KnexConfig = {
  client: 'pg',
  connection: {
    host: 'localhost',
    user: 'postgres',
    password: 'foo',
    database: 'db_ci_test',
  },
}

// Define database model
export interface Db {
  tb_user: UserDo
  tb_user_ext: UserExtDo
}

export interface UserDo {
  uid: number
  name: string
  ctime: Date
}
export interface UserExtDo {
  uid: number
  age: number
  address: string
}  

const dict = genDbDict<Db>()
export const km = kmoreFactory({ config, dict })
```

### Create tables with instance of knex
```ts
await km.dbh.schema
  .createTable('tb_user', (tb) => {
    tb.increments('uid')
    tb.string('name', 30)
    tb.timestamp('ctime', { useTz: false })
  })
  .createTable('tb_user_ext', (tb) => {
    tb.integer('uid')
    tb.foreign('uid')
      .references('tb_user.uid')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
    tb.integer('age')
    tb.string('address', 255)
  })
  .catch((err: Error) => {
    assert(false, err.message)
  })
```

### Inert rows via auto generated table accessor

#### Snake style
```ts
// auto generated accessort tb_user() and tb_user_detail()
const { ref_tb_user, ref_tb_user_detail } = km.refTables

await ref_tb_user()
  .insert([
    { user_name: 'user1', ctime: new Date() }, // ms
    { user_name: 'user2', ctime: 'now()' }, // μs
  ])
  .then()

const affectedRows = await ref_tb_user_detail()
  .insert([
    { uid: 1, age: 10, user_address: 'address1' },
    { uid: 2, age: 10, user_address: 'address1' },
  ])
  .returning('*')
  .then()
```

#### Camel style
```ts
import { RecordCamelKeys } from '@waiting/shared-types'

// auto generated accessort tb_user() and tb_user_detail() 
const { ref_tb_user, ref_tb_user_detail } = km.camelTables

interface UserDO {
  user_name: string
  ctime: date | string
}
type UserDTO = RecordCamelKeys<UserDO>

const users: UserDTO[] = await ref_tb_user()
  .insert([
    { userName: 'user1', ctime: new Date() }, // ms
    { userName: 'user2', ctime: 'now()' }, // μs
  ])
  .returning('*')
  .then()
```

### Smart Join tables with types hint and auto complete
```ts
const uid = 1

// tb_user JOIN tb_user_ext ON tb_user_ext.uid = tb_user.uid
const ret = await km.camelTables.ref_tb_user()
  .smartJoin(
    'tb_user_ext.uid',
    'tb_user.uid',
  )
  .select('*')
  .where({ uid }) // <-- has auto-complete with 'uid'
  // .where('uid', uid)   <-- has auto-complete with 'uid'
  // .where('tb_user_ext_uid', uid) <-- has auto-complete with 'tb_user_ext_uid'
  // .where(km.dict.scoped.tb_user.uid, 1)
  .then(rows => rows[0])

assert(ret)
ret.uid
ret.tb_user_ext_uid   // <-- duplicate uid will be converted with table prefix like "<tb_name>_<column>"

```

More examples of join see [joint-table](https://github.com/waitingsong/kmore/blob/main/packages/kmore/test/join-table/)


### Use instance of knex
```ts
// drop table
await km.dbh.raw(`DROP TABLE IF EXISTS "${tb}" CASCADE;`).then()

// disconnect
await km.dbh.destroy()
```

## Midway.js component

### Config
```ts
// file: src/config/config.{prod | local | unittest}.ts

import { genDbDict } from 'kmore-types'
import { KmoreSourceConfig } from '@mw-components/kmore'
import { TbAppDO, TbMemberDO } from '../do/database.do.js'

export interface Db {
  tb_app: TbAppDO
  tb_user: TbMemberDO
}

export const dbDict = genDbDict<Db>()

const master: DbConfig<Db, Context> = {
  config: {
    client: 'pg',
    connection: {
      host: 'localhost',
      port: 5432,
      database: 'db_test',
      user: 'postgres',
      password: 'password',
    },
  },
  dict: dbDict,
  sampleThrottleMs: 500,
  enableTracing: true, // jaeger tracer
}
export const kmoreConfig: KmoreSourceConfig = {
  dataSource: {
    master,
    // slave,
  },
}  
```

### Usage
```ts
import { Init, Inject } from '@midwayjs/decorator'

@Provide()
export class UserRepo {

  @Inject() dbManager: DbManager<'master' | 'slave', Db>

  protected db: Kmore<Db>

  @Init()
  async init(): Promise<void> {
    this.db = this.dbManager.getDataSource('master')
  }

  async getUser(uid: number): Promise<UserDTO | undefined> {
    const { ref_tb_user } = this.db.camelTables
    const user = await ref_tb_user()
      .where({ uid })
      .then(rows => rows[0])
    return user
  }
}
```


## Demo
- [see test](https://github.com/waitingsong/kmore/blob/main/test/)


## Packages

kmore is comprised of many specialized packages.
This repository contains all these packages. Below you will find a summary of each package.

| Package                  | Version                  |
| ------------------------ | ------------------------ |
| [`kmore`]                | [![kmore-svg]][kmore-ch] |
| [`kmore-types`]          | [![types-svg]][types-ch] |
| [`kmore-cli`]            | [![cli-svg]][cli-ch]     |
| [`@mw-components/kmore`] | [![mw-svg]][mw-ch]       |



## License
[MIT](LICENSE)


### Languages
- [English](README.md)
- [中文](README.zh-CN.md)


[`kmore`]: https://github.com/waitingsong/kmore/tree/main/packages/kmore
[`kmore-types`]: https://github.com/waitingsong/kmore/tree/main/packages/kmore-types
[`kmore-cli`]: https://github.com/waitingsong/kmore/tree/main/packages/kmore-cli
[`@mw-components/kmore`]: https://github.com/waitingsong/kmore/tree/main/packages/midway-component-kmore

[kmore-svg]: https://img.shields.io/npm/v/kmore.svg?maxAge=7200
[kmore-ch]: https://github.com/waitingsong/kmore/tree/main/packages/kmore/CHANGELOG.md

[types-svg]: https://img.shields.io/npm/v/kmore-types.svg?maxAge=7200
[types-ch]: https://github.com/waitingsong/kmore/tree/main/packages/kmore-types/CHANGELOG.md

[cli-svg]: https://img.shields.io/npm/v/kmore-cli.svg?maxAge=7200
[cli-ch]: https://github.com/waitingsong/kmore/tree/main/packages/kmore-clie/CHANGELOG.md


[mw-svg]: https://img.shields.io/npm/v/@mw-components/kmore.svg?maxAge=7200
[mw-ch]: https://github.com/waitingsong/kmore/tree/main/packages/midway-component-kmore/CHANGELOG.md


<br>

[pg-native]: https://github.com/brianc/node-pg-native

