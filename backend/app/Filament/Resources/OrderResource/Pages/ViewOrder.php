<?php

namespace App\Filament\Resources\OrderResource\Pages;

use App\Filament\Resources\OrderResource;
use Filament\Actions\Action;
use Filament\Resources\Pages\ViewRecord;

class ViewOrder extends ViewRecord
{
    protected static string $resource = OrderResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('print')
                ->label('طباعة / PDF')
                ->icon('heroicon-o-printer')
                ->color('gray')
                ->url(fn () => route('orders.print', $this->record->id))
                ->openUrlInNewTab(),
        ];
    }
}
