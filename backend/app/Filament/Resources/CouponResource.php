<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CouponResource\Pages;
use App\Models\Coupon;
use App\Models\Product;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ToggleColumn;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;

class CouponResource extends Resource
{
    protected static ?string $model = Coupon::class;

    protected static string|\BackedEnum|null $navigationIcon   = 'heroicon-o-ticket';
    protected static ?string                 $navigationLabel  = 'أكواد الخصم';
    protected static \UnitEnum|string|null   $navigationGroup  = 'التسويق والعروض';
    protected static ?int                    $navigationSort   = 1;
    protected static ?string                 $modelLabel       = 'كود خصم';
    protected static ?string                 $pluralModelLabel = 'أكواد الخصم والكوبونات';

    public static function form(Schema $form): Schema
    {
        return $form->components([
            Section::make('بيانات الكوبون')->schema([
                Grid::make(3)->schema([
                    TextInput::make('code')
                        ->label('كود الخصم')
                        ->required()
                        ->unique(ignoreRecord: true)
                        ->maxLength(100)
                        ->placeholder('مثال: SAVE20'),

                    Select::make('type')
                        ->label('نوع الخصم')
                        ->options([
                            'percent' => 'نسبة مئوية (%)',
                            'fixed'   => 'مبلغ ثابت (ر.س)',
                        ])
                        ->default('percent')
                        ->required()
                        ->live(),

                    TextInput::make('amount')
                        ->label(fn ($get) => $get('type') === 'percent' ? 'نسبة الخصم (%)' : 'قيمة الخصم (ر.س)')
                        ->numeric()
                        ->minValue(0)
                        ->required()
                        ->suffix(fn ($get) => $get('type') === 'percent' ? '%' : 'ر.س'),
                ]),

                TextInput::make('description')
                    ->label('وصف الكوبون (اختياري)')
                    ->maxLength(500)
                    ->placeholder('مثال: خصم خاص بمناسبة نهاية الأسبوع')
                    ->columnSpanFull(),
            ]),

            Section::make('الشروط والقيود')->schema([
                Grid::make(3)->schema([
                    TextInput::make('minimum_amount')
                        ->label('الحد الأدنى للسلة (ر.س)')
                        ->numeric()
                        ->minValue(0)
                        ->default(0)
                        ->helperText('0 = بدون حد أدنى'),

                    TextInput::make('maximum_amount')
                        ->label('الحد الأقصى للسلة (ر.س)')
                        ->numeric()
                        ->minValue(0)
                        ->default(0)
                        ->helperText('0 = بدون حد أقصى'),

                    TextInput::make('usage_limit')
                        ->label('أقصى عدد مرات استخدام')
                        ->numeric()
                        ->minValue(1)
                        ->placeholder('غير محدود'),
                ]),

                Grid::make(2)->schema([
                    DateTimePicker::make('expires_at')
                        ->label('تاريخ الانتهاء (اختياري)')
                        ->placeholder('بدون تاريخ انتهاء'),

                    Select::make('product_ids')
                        ->label('تخصيص لمنتجات محددة (اختياري)')
                        ->helperText('اتركه فارغاً ليشمل كل المنتجات')
                        ->multiple()
                        ->searchable()
                        ->getSearchResultsUsing(fn (string $search) => Product::query()
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('sku', 'like', "%{$search}%")
                            ->limit(30)
                            ->pluck('name', 'id')
                            ->toArray())
                        ->getOptionLabelsUsing(fn (array $values) => Product::query()
                            ->whereIn('id', $values)
                            ->pluck('name', 'id')
                            ->toArray()),
                ]),

                Grid::make(2)->schema([
                    Toggle::make('free_shipping')
                        ->label('يمنح توصيلاً مجانياً أيضاً')
                        ->default(false),

                    Toggle::make('is_active')
                        ->label('مفعّل')
                        ->default(true),
                ]),
            ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('code')
                    ->label('الكود')
                    ->searchable()
                    ->sortable()
                    ->weight('bold')
                    ->copyable(),

                TextColumn::make('type')
                    ->label('النوع')
                    ->formatStateUsing(fn ($state) => $state === 'percent' ? 'نسبة %' : 'مبلغ ثابت')
                    ->badge()
                    ->color(fn ($state) => $state === 'percent' ? 'info' : 'success'),

                TextColumn::make('amount')
                    ->label('القيمة')
                    ->formatStateUsing(fn ($state, Coupon $record) => $record->type === 'percent'
                        ? rtrim(rtrim((string) $state, '0'), '.') . '%'
                        : number_format((float) $state, 2) . ' ر.س'),

                IconColumn::make('free_shipping')
                    ->label('شحن مجاني')
                    ->boolean(),

                TextColumn::make('usage_count')
                    ->label('الاستخدام')
                    ->formatStateUsing(fn ($state, Coupon $record) => $record->usage_limit
                        ? "{$state} / {$record->usage_limit}"
                        : (string) $state)
                    ->badge()
                    ->color('gray'),

                TextColumn::make('expires_at')
                    ->label('ينتهي في')
                    ->dateTime('d/m/Y H:i')
                    ->placeholder('مفتوح')
                    ->sortable(),

                ToggleColumn::make('is_active')
                    ->label('مفعّل'),
            ])
            ->filters([
                TernaryFilter::make('is_active')->label('الحالة'),
            ])
            ->defaultSort('id', 'desc')
            ->actions([
                EditAction::make()->label('تعديل'),
                DeleteAction::make()->label('حذف'),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make()->label('حذف المحدد'),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListCoupons::route('/'),
            'create' => Pages\CreateCoupon::route('/create'),
            'edit'   => Pages\EditCoupon::route('/{record}/edit'),
        ];
    }
}
