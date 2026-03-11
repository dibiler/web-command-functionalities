<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('theme_background_color', 7)->default('#09090b');
            $table->string('theme_font_color', 7)->default('#f4f4f5');
            $table->string('font_family')->default('Fira Code, Consolas, monospace');
            $table->unsignedTinyInteger('font_size')->default(14);
            $table->decimal('line_height', 3, 2)->default(1.50);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_settings');
    }
};
