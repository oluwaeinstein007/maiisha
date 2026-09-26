<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Per-admin read cursor for the notification bell: anything that happened
            // after this is "unread". Meaningless for a customer account, but scoping it
            // to users (rather than a separate admins table, which doesn't exist) keeps
            // this a one-column addition instead of a new table for a single timestamp.
            $table->timestamp('notifications_read_at')->nullable()->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('notifications_read_at');
        });
    }
};
