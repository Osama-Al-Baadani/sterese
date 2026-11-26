<?php

namespace App\Filament\Resources\ApiKeyResource\Pages;

use App\Filament\Resources\ApiKeyResource;
use App\Models\ApiKey;
use Filament\Actions\Action;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Pages\ListRecords;

class ListApiKeys extends ListRecords
{
    protected static string $resource = ApiKeyResource::class;

    public function showCredentialsAction(): Action
    {
        return Action::make('showCredentials')
            ->modalHeading(fn (array $arguments): string => $arguments['heading'] ?? 'بيانات مفتاح الـ API')
            ->modalIcon('heroicon-o-key')
            ->modalIconColor('success')
            ->modalWidth('lg')
            ->modalContent(fn (array $arguments) => view('filament.api-key-credentials', [
                'key'    => $arguments['key'] ?? '',
                'secret' => $arguments['secret'] ?? '',
            ]))
            ->modalSubmitAction(false)
            ->modalCancelActionLabel('تم، أغلق النافذة');
    }

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
                        'label' => $data['label'],
                        'is_active' => true,
                    ]);

                    $this->replaceMountedAction('showCredentials', [
                        'heading' => 'تم إنشاء مفتاح الـ API بنجاح',
                        'key'     => $apiKey->key,
                        'secret'  => $apiKey->plainSecret,
                    ]);
                }),
        ];
    }
}
