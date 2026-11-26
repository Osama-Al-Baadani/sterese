<?php

namespace App\Filament\Resources\ApiKeyResource\Pages;

use App\Filament\Resources\ApiKeyResource;
use App\Models\ApiKey;
use Filament\Actions\Action;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ListRecords;

class ListApiKeys extends ListRecords
{
    protected static string $resource = ApiKeyResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('generate_key')
                ->label('+ توليد مفتاح API جديد')
                ->icon('heroicon-o-plus')
                ->form([
                    TextInput::make('label')
                        ->label('اسم الجهة المستخدمة للمفتاح')
                        ->required()
                        ->maxLength(150)
                        ->placeholder('مثال: storeseco-web (Next.js website)'),
                ])
                ->action(function (array $data) {
                    $apiKey = ApiKey::create([
                        'label'     => $data['label'],
                        'is_active' => true,
                    ]);

                    if ($apiKey->plainSecret) {
                        \Illuminate\Support\Facades\Cache::put('apikey_plain_secret_' . $apiKey->id, $apiKey->plainSecret, now()->addMinutes(10));
                    }

                    Notification::make()
                        ->title('تم إنشاء مفتاح الـ API — انسخ البيانات الآن (الـ Secret يظهر مرة واحدة فقط!)')
                        ->body("V2_API_KEY={$apiKey->key}\nV2_API_SECRET={$apiKey->plainSecret}")
                        ->success()
                        ->persistent()
                        ->send();
                }),
        ];
    }
}
