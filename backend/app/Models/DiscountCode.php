<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'type', 'value', 'usage_limit', 'expires_at', 'is_active'])]
class DiscountCode extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'expires_at' => 'datetime',
        ];
    }

    public function usages(): HasMany
    {
        return $this->hasMany(DiscountCodeUsage::class);
    }

    public function isValid(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if ($this->expires_at && $this->expires_at->isPast()) {
            return false;
        }

        if ($this->usage_limit !== null && $this->usages()->count() >= $this->usage_limit) {
            return false;
        }

        return true;
    }

    /**
     * Separate from isValid() so callers can tell "invalid/expired" apart
     * from "valid code, but you've already used it" and message accordingly
     * (FR-21 covers one code per order; this additionally stops one customer
     * reapplying the same single-use code across separate orders).
     */
    public function usedBy(int $userId): bool
    {
        return $this->usages()->where('user_id', $userId)->exists();
    }

    public function discountPenceFor(int $subtotalPence): int
    {
        if ($this->type === 'percentage') {
            return (int) round($subtotalPence * ($this->value / 100));
        }

        return min($this->value, $subtotalPence);
    }
}
