<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['parent_id', 'name', 'slug', 'description', 'image_path', 'sort_order'])]
class Category extends Model
{
    use HasFactory;

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id')->orderBy('sort_order');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /**
     * $ids plus every category beneath them, at any depth. A shopper on
     * "Women's fashion" expects to see Dresses too, and a sale on the parent
     * should cover them — both go through here so they can't disagree.
     *
     * @param  list<int>  $ids
     * @param  array<int, int|null>|null  $parents  category id => parent id, if already loaded
     * @return list<int>
     */
    public static function idsWithDescendants(array $ids, ?array $parents = null): array
    {
        $parents ??= static::query()->pluck('parent_id', 'id')->all();
        $covered = array_fill_keys($ids, true);

        do {
            $grew = false;
            foreach ($parents as $id => $parentId) {
                if ($parentId !== null && isset($covered[$parentId]) && ! isset($covered[$id])) {
                    $covered[$id] = true;
                    $grew = true;
                }
            }
        } while ($grew);

        return array_map('intval', array_keys($covered));
    }
}
