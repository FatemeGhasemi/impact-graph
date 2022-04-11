import { findAllCategories } from './categoryRepository';
import { assert } from 'chai';

describe('findAllCategories test cases', () => {
  it('should find all categories', async () => {
    const categories = await findAllCategories();
    assert.isOk(categories);
    assert.notEqual(categories.length, 0);
  });
});
