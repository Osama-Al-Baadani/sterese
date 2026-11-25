<?php

namespace App\Filament\Resources;

use App\Filament\Resources\DeliveryZoneResource\Pages;
use App\Models\DeliveryZone;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TagsInput;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Cache;

class DeliveryZoneResource extends Resource
{
    protected static ?string $model = DeliveryZone::class;

    protected static string|\BackedEnum|null $navigationIcon   = 'heroicon-o-map-pin';
    protected static ?string                 $navigationLabel  = 'مناطق التوصيل';
    protected static ?string                 $modelLabel       = 'منطقة توصيل';
    protected static ?string                 $pluralModelLabel = 'مناطق التوصيل';
    protected static ?int                    $navigationSort   = 6;

    public static function form(Schema $form): Schema
    {
        return $form->components([

            Section::make('📍 بيانات المنطقة')->schema([
                Grid::make(2)->schema([
                    TextInput::make('name')
                        ->label('اسم المنطقة')
                        ->required()
                        ->maxLength(100)
                        ->placeholder('مثال: الرياض'),

                    TextInput::make('sort_order')
                        ->label('الترتيب')
                        ->numeric()
                        ->default(0),
                ]),

                TagsInput::make('cities')
                    ->label('المدن التابعة لهذه المنطقة')
                    ->placeholder('اكتب اسم المدينة ثم Enter')
                    ->helperText('أضف كل مدينة على حدة — العميل سيختار من هذه القائمة')
                    ->columnSpanFull(),
            ]),

            Section::make('💰 أسعار التوصيل')->schema([
                Grid::make(2)->schema([
                    TextInput::make('base_fee')
                        ->label('سعر التوصيل الأساسي (ر.س)')
                        ->numeric()
                        ->minValue(0)
                        ->required()
                        ->placeholder('25'),

                    TextInput::make('free_threshold')
                        ->label('حد الشحن المجاني (ر.س) — 0 = بدون')
                        ->numeric()
                        ->minValue(0)
                        ->default(0)
                        ->helperText('الطلبات فوق هذا المبلغ شحنها مجاني — 0 لإلغاء الميزة'),
                ]),

                Toggle::make('is_active')
                    ->label('المنطقة مفعّلة')
                    ->default(true),
            ]),

            Section::make('🎉 عرض التوصيل المجاني')->schema([
                Toggle::make('promo_active')
                    ->label('تفعيل عرض التوصيل المجاني')
                    ->live(),

                Select::make('promo_type')
                    ->label('نوع العرض')
                    ->options([
                        'schedule'    => '📅 فترة زمنية محددة',
                        'first_order' => '🎁 أول طلب للعميل الجديد',
                    ])
                    ->live()
                    ->visible(fn ($get) => $get('promo_active')),

                Grid::make(2)->schema([
                    DateTimePicker::make('promo_start')
                        ->label('تاريخ بداية العرض')
                        ->displayFormat('d/m/Y H:i')
                        ->visible(fn ($get) => $get('promo_active') && $get('promo_type') === 'schedule'),

                    DateTimePicker::make('promo_end')
                        ->label('تاريخ انتهاء العرض')
                        ->displayFormat('d/m/Y H:i')
                        ->visible(fn ($get) => $get('promo_active') && $get('promo_type') === 'schedule'),
                ]),

                TextInput::make('promo_label')
                    ->label('رسالة العرض (تظهر للعميل)')
                    ->placeholder('مثال: 🎉 توصيل مجاني لأحياء الرياض!')
                    ->maxLength(150)
                    ->visible(fn ($get) => $get('promo_active')),
            ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('المنطقة')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('cities')
                    ->label('المدن')
                    ->formatStateUsing(fn ($state) => is_array($state) ? implode('، ', $state) : '—')
                    ->wrap(),
                Tables\Columns\TextColumn::make('base_fee')
                    ->label('سعر التوصيل')
                    ->suffix(' ر.س')
                    ->sortable(),
                Tables\Columns\IconColumn::make('promo_active')
                    ->label('عرض نشط')
                    ->boolean(),
                Tables\Columns\TextColumn::make('promo_type')
                    ->label('نوع العرض')
                    ->formatStateUsing(fn ($state) => match($state) {
                        'schedule'    => '📅 زمني',
                        'first_order' => '🎁 أول طلب',
                        default       => '—',
                    }),
                Tables\Columns\TextColumn::make('promo_end')
                    ->label('ينتهي')
                    ->dateTime('d/m/Y H:i')
                    ->placeholder('—'),
                Tables\Columns\IconColumn::make('is_active')
                    ->label('مفعّلة')
                    ->boolean(),
            ])
            ->defaultSort('sort_order')
            ->reorderable('sort_order')
            ->afterReordering(fn () => Cache::forget('app_config'))
            ->actions([
                EditAction::make()->label('تعديل')
                    ->after(fn () => Cache::forget('app_config')),
                DeleteAction::make()->label('حذف')
                    ->after(fn () => Cache::forget('app_config')),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListDeliveryZones::route('/'),
            'create' => Pages\CreateDeliveryZone::route('/create'),
            'edit'   => Pages\EditDeliveryZone::route('/{record}/edit'),
        ];
    }
}
