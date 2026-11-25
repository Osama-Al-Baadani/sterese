<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WelcomeOfferClaim extends Model
{
    protected $fillable = ['phone', 'coupon_code'];
}
