<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommandEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'command_tab_id',
        'client_id',
        'command',
        'response',
        'status',
        'executed_at',
    ];

    protected $casts = [
        'executed_at' => 'datetime',
    ];

    public function tab(): BelongsTo
    {
        return $this->belongsTo(CommandTab::class, 'command_tab_id');
    }
}
