<?php

namespace App\Filament\Widgets;

use App\Models\AppInstall;
use Filament\Widgets\TableWidget as BaseWidget;
use Filament\Tables\Table;
use Filament\Tables\Columns\TextColumn;
use Illuminate\Database\Eloquent\Builder;

class AppInstallsByChannel extends BaseWidget
{
    protected static ?int $sort = 2;
    protected int|string|array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        return $table
            ->heading('التثبيتات حسب المنصة والمصدر الإعلاني')
            ->query(
                AppInstall::query()
                    ->selectRaw("
                        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as id,
                        COALESCE(platform, 'غير معروف') as platform,
                        COALESCE(NULLIF(media_source, ''), 'عضوي (Organic)') as media_source,
                        COUNT(*) as total
                    ")
                    ->groupBy('platform', 'media_source')
                    ->orderByDesc('total')
            )
            ->columns([
                TextColumn::make('platform')
                    ->label('المنصة')
                    ->badge()
                    ->formatStateUsing(fn (?string $state) => match ($state) {
                        'ios'     => 'iOS',
                        'android' => 'Android',
                        default   => $state,
                    })
                    ->color(fn (?string $state) => match ($state) {
                        'ios'     => 'gray',
                        'android' => 'success',
                        default   => 'gray',
                    }),
                TextColumn::make('media_source')->label('المصدر الإعلاني'),
                TextColumn::make('total')->label('عدد التثبيتات')->sortable(),
            ])
            ->paginated(false);
    }
}
