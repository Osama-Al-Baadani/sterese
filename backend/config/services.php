<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'paymob' => [
        'api_key'              => env('PAYMOB_API_KEY'),           // legacy 3-step API
        'secret_key'           => env('PAYMOB_SECRET_KEY'),
        'public_key'           => env('PAYMOB_PUBLIC_KEY'),
        'card_integration_id'  => env('PAYMOB_CARD_INTEGRATION_ID', 23389),
        'apple_integration_id' => env('PAYMOB_APPLE_INTEGRATION_ID', 23388),
        'hmac_secret'          => env('PAYMOB_HMAC_SECRET'),
        'currency'             => env('PAYMOB_CURRENCY', 'SAR'),
    ],

    'woocommerce' => [
        'url'            => env('WOOCOMMERCE_URL'),
        'key'            => env('WOOCOMMERCE_KEY'),
        'secret'         => env('WOOCOMMERCE_SECRET'),
        'webhook_secret' => env('WC_WEBHOOK_SECRET'),
    ],

    'app' => [
        'wallet_secret' => env('WALLET_SECRET'),
    ],

    'v2_api' => [
        'key'    => env('V2_API_KEY'),
        'secret' => env('V2_API_SECRET'),
    ],

    'connectsaudi' => [
        // Left empty until Connect Saudi issues real credentials — SmsService
        // falls back to logging (not sending) while user/sender_id are unset
        // or neither api_key nor password is set.
        'user'      => env('CONNECTSAUDI_USER'),
        'api_key'   => env('CONNECTSAUDI_API_KEY'),
        'password'  => env('CONNECTSAUDI_PASSWORD'),
        'sender_id' => env('CONNECTSAUDI_SENDER_ID'),
    ],

    'whatsapp' => [
        // Left empty until the Meta WhatsApp Cloud API app is set up —
        // WhatsAppService falls back to logging (not sending) while any of
        // these is unset.
        'token'          => env('WHATSAPP_ACCESS_TOKEN'),
        'phone_number_id'=> env('WHATSAPP_PHONE_NUMBER_ID'),
        'template_name'  => env('WHATSAPP_CART_TEMPLATE', 'cart_reminder'),
        'language'       => env('WHATSAPP_TEMPLATE_LANG', 'ar'),
    ],

    'snapchat' => [
        // من Snapchat Ads Manager: Events Manager → إعدادات البكسل/التطبيق
        'app_id'       => env('SNAPCHAT_APP_ID'),
        'access_token' => env('SNAPCHAT_ACCESS_TOKEN'),
    ],

    'firebase' => [
        'project_id'      => env('FIREBASE_PROJECT_ID', 'storeseco111'),
        'credential_path' => env('FIREBASE_CREDENTIAL_PATH',
            storage_path('app/firebase-service-account.json')),
    ],

];
