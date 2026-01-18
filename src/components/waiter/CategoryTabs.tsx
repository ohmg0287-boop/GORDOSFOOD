import React from 'react';
import { Category } from '@/types/database';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface CategoryTabsProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelect: (categoryId: string | null) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  selectedCategory,
  onSelect
}) => {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-3">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelect(null)}
          className="rounded-full"
        >
          Todos
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(category.id)}
            className="rounded-full"
          >
            {category.name}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
