import { Category } from '../entities/category';

export const findAllCategories = () => {
  return Category.find();
};
