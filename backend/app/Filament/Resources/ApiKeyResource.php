<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ApiKeyResource\Pages;
use App\Models\ApiKey;
use Filament\Actions\Action;
use Filament\Actions\DeleteAction;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ToggleColumn;
use Filament\Tables\Table;

class ApiKeyResource extends Resource
{
    protected static ?string $model = ApiKey::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-key';
    protected static ?string $navigationLabel = 'مفاتيح الربط (API v2)';
    protected static \UnitEnum|string|null $navigationGroup = 'الإعدادات والنظام';
    protected static ?int $navigationSort = 11;
    protected static ?string $modelLabel = 'مفتاح API';
    protected static ?string $pluralModelLabel = 'مفاتيح الربط (API v2)';

    public static function form(Schema $form): Schema
    {
        return $form->components([
            Section::make('بيانات المفتاح')->schema([
                TextInput::make('label')
                    ->label('الاسم الوصفي للمفتاح')
                    ->required()
                    ->maxLength(150)
                    ->placeholder('مثال: storeseco-web (Next.js website)'),

                Toggle::make('is_active')
                    ->label('مفعّل')
                    ->default(true),
            ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('label')
                    ->label('الوصف / الجهة')
                    ->searchable()
                    ->weight('bold'),

                TextColumn::make('key')
                    ->label('مفتاح الـ API (V2_API_KEY)')
                    ->copyable()
                    ->fontFamily('mono'),

                ToggleColumn::make('is_active')
                    ->label('مفعّل'),

                TextColumn::make('last_used_at')
                    ->label('آخر استخدام')
                    ->dateTime('d/m/Y H:i')
                    ->placeholder('لم يُستخدم بعد')
                    ->sortable(),

                TextColumn::make('created_at')
                    ->label('تاريخ الإنشاء')
                    ->dateTime('d/m/Y')
                    ->sortable(),
            ])
            ->defaultSort('id', 'desc')
            ->actions([
                Action::make('regenerate')
                    ->label('تدوير الـ Secret')
                    ->icon('heroicon-o-arrow-path')
                    ->color('warning')
                    ->requiresConfirmation()
                    ->modalHeading('توليد Secret جديد؟')
                    ->modalDescription('سيتم إبطال الـ Secret القديم فوراً، ويجب تحديثه في ملف البيئة (.env) للجهة المرتبطة.')
                    ->action(function (ApiKey $record, $livewire) {
                        $secret = $record->regenerateSecret();

                        $livewire->js('window.prompt("انسخ الـ V2_API_SECRET الجديد الآن (Ctrl+C):", ' . json_encode($secret) . ')');

                        $livewire->replaceMountedAction('showCredentials', [
                            'heading' => 'تم توليد Secret جديد بنجاح',
                            'key'     => $record->key,
                            'secret'  => $secret,
                        ]);
                    }),
                DeleteAction::make()->label('حذف'),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListApiKeys::route('/'),
        ];
    }
}