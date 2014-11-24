/*
* mocha's bdd syntax is inspired in RSpec
*   please read: http://betterspecs.org/
*/
require('./util/globals');

describe('exhibitor', function(){
  before(function(){
  });
  it('has a semver version', function(){
    expect(exhibitor.version).to.match(/^\d+\.\d+\.\d+(-.*)?$/);
  });
});
