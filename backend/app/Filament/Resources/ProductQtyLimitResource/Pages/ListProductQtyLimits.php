<?php

namespace App\Filament\Resources\ProductQtyLimitResource\Pages;

use App\Filament\Resources\ProductQtyLimitResource;
use App\Models\AppSetting;
use Filament\Actions\CreateAction;
use Filament\Actions\Action;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ListRecords;
use Illuminate\Support\Facades\Cache;

class ListProductQtyLimits extends ListRecords
{
    protected static string $resource = ProductQtyLimitResource::class;

    protected function getHeaderActions(): array
    {
        $globalMax = AppSetting::current()->default_max_qty ?? 10;

        return [
            Action::make('global_limit')
                ->label("الحد العالمي لكل المنتجات: {$globalMax} حبة")
                ->icon('heroicon-o-globe-alt')
                ->color('gray')
                ->form([
                    TextInput::make('default_max_qty')
                        ->label('الحد الأقصى الافتراضي (ينطبق على كل المنتجات)')
                        ->numeric()
                        ->minValue(1)
                        ->required()
                        ->default($globalMax)
                        ->helperText('المنتجات التي أضفتها بالأسفل تأخذ الحد الأقل منهما'),
                ])
                ->action(function (array $data) {
                    AppSetting::current()->update([
                        'default_max_qty' => (int) $data['default_max_qty'],
                    ]);
                    Cache::forget('app_config');
                    Notification::make()
                        ->title('تم تحديث الحد العالمي')
                        ->success()
                        ->send();
                    $this->redirect(static::getResource()::getUrl('index'));
                }),

            CreateAction::make()->label('إضافة حد لمنتج معين'),
        ];
    }
}
