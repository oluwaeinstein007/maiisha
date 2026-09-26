<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

#[Fillable(['name', 'slug', 'description', 'logo_path', 'is_active', 'sort_order'])]
class Brand extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function sales(): BelongsToMany
    {
        return $this->belongsToMany(Sale::class, 'sale_brand');
    }

    /** The logo's public URL, or null when none has been uploaded. */
    public function logoUrl(): ?string
    {
        if ($this->logo_path === null) {
            return null;
        }

        if (str_starts_with($this->logo_path, 'http') || str_starts_with($this->logo_path, 'data:')) {
            return $this->logo_path;
        }

        return Storage::disk('public')->url($this->logo_path);
    }
}
