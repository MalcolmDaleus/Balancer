<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'password',
        'currency'
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function purchases() {
        return $this->hasMany(Purchase::class); 
    }

    public function debts() { 
        return $this->hasMany(Debt::class); 
    }
    
    public function savings() { 
        return $this->hasMany(Saving::class); 
    }

    public function incomeStreams() {
         return $this->hasMany(IncomeStream::class); 
    }

    public function incomeEntries() {
         return $this->hasMany(IncomeEntry::class); 
    }
    
    public function balanceSheets() {
         return $this->hasMany(BalanceSheetTotal::class); 
    }
}
