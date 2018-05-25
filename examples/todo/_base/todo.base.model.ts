// This is an auto-generated Class file. -- DO NOT EDIT!

import {Entity} from '@loopback/repository';

export class TodoBase extends Entity {
  @property({
type:'number',
id:'true',
})
  id?: number;

  @property({
type:'string',
required:'true',
})
  title: string;

  @property({
type:'string',
})
  desc?: string;

  @property({
type:'boolean',
})
  isComplete?: boolean;

}
