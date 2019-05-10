// CANNOT import from the published repository, have to use relative path
// This should be fixed when the module graduates
// import {AuthenticationStrategy} from '@loopback/authentication';
import {AuthenticationStrategy, UserProfile} from '../../authentication';
import {Request} from '../../rest';
export class MockPassportAdapter implements AuthenticationStrategy{ 
  name: 'mock-passport-adapter';
  authenticate(request: Request): Promise<UserProfile | undefined> {
    return Promise.resolve(undefined);
  };
}
