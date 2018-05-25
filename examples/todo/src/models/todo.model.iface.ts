import {Entity} from '@loopback/repository';

// This is an auto-generated interface file -- DO NOT EDIT!

export class TodoModelIface extends Entity {
  id: number;
  title: string;
  desc?: string;
  isComplete?: boolean;
}
