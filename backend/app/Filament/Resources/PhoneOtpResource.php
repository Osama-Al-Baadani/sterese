<?php

namespace App\Filament\Resources;

use App\Filament\Exports\PhoneOtpExporter;
use App\Filament\Resources\PhoneOtpResource\Pages;
use App\Models\PhoneOtp;
use Filament\Actions\ExportBulkAction;
use Filament\Forms\Components\DatePicker;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PhoneOtpResource extends Resource
{
    protected static ?string $model = PhoneOtp::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-key';
    protected static ?string $navigationLabel  = 'رموز التحقق (OTP)';
    protected static ?string $modelLabel       = 'رمز تحقق';
    protected static ?string $pluralModelLabel = 'رموز التحقق (OTP)';
    protected static ?int    $navigationSort   = 3;

    // Temporary — only useful while SMS sending isn't wired up to a real
    // provider yet. Remove this resource once Digital Saudi (or whichever
    // provider) is connected and actually delivering the SMS.
    public static function form(Schema $form): Schema
    {
        return $form->components([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('phone')->label('الجوال')->searchable(),
                Tables\Columns\TextColumn::make('ip_address')->label('عنوان IP')
                    ->searchable()->copyable()->default('—')->toggleable(),
                Tables\Columns\TextColumn::make('user_agent')->label('الجهاز')
                    ->default('—')->toggleable(isToggledHiddenByDefault: true)
                    ->limit(60)->tooltip(fn ($state) => $state),
                Tables\Columns\TextColumn::make('code')->label('الرمز')
                    ->copyable()->copyMessage('تم نسخ الرمز')
                    ->weight('bold')->size('lg'),
                Tables\Columns\TextColumn::make('attempts')->label('المحاولات الخاطئة'),
                Tables\Columns\TextColumn::make('expires_at')->label('ينتهي في')->dateTime('H:i:s'),
                Tables\Columns\TextColumn::make('consumed_at')->label('الحالة')
                    ->badge()
                    ->formatStateUsing(fn ($state) => $state ? 'تم استخدامه' : 'ساري')
                    ->color(fn ($state) => $state ? 'gray' : 'success'),
                Tables\Columns\TextColumn::make('created_at')->label('وقت الإرسال')->dateTime('d/m/Y H:i:s')->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                Tables\Filters\Filter::make('created_at')
                    ->label('تاريخ الإرسال')
                    ->form([
                        DatePicker::make('from')->label('من تاريخ'),
                        DatePicker::make('until')->label('إلى تاريخ'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when($data['from'] ?? null, fn (Builder $q, $date) => $q->whereDate('created_at', '>=', $date))
                            ->when($data['until'] ?? null, fn (Builder $q, $date) => $q->whereDate('created_at', '<=', $date));
                    })
                    ->indicateUsing(function (array $data): array {
                        $indicators = [];
                        if ($data['from'] ?? null) {
                            $indicators['from'] = 'من: ' . $data['from'];
                        }
                        if ($data['until'] ?? null) {
                            $indicators['until'] = 'إلى: ' . $data['until'];
                        }
                        return $indicators;
                    }),
            ])
            ->actions([])
            ->bulkActions([
                ExportBulkAction::make()
                    ->label('تصدير المحدد (Excel)')
                    ->exporter(PhoneOtpExporter::class),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPhoneOtps::route('/'),
        ];
    }
}
