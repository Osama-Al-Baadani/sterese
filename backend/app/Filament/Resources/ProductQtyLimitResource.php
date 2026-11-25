<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ProductQtyLimitResource\Pages;
use App\Models\Product;
use App\Models\ProductQtyLimit;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Cache;

class ProductQtyLimitResource extends Resource
{
    protected static ?string $model = ProductQtyLimit::class;

    protected static string|\BackedEnum|null $navigationIcon   = 'heroicon-o-archive-box';
    protected static ?string                 $navigationLabel  = 'حدود كميات المنتجات';
    protected static \UnitEnum|string|null   $navigationGroup  = 'كتالوج المتجر';
    protected static ?string                 $modelLabel       = 'حد كمية';
    protected static ?string                 $pluralModelLabel = 'حدود كميات المنتجات';
    protected static ?int                    $navigationSort   = 5;

    public static function form(Schema $form): Schema
    {
        return $form->components([
            Section::make('تحديد الحد الأقصى لشراء منتج في السلة')->schema([
                Select::make('woo_product_id')
                    ->label('اختر المنتج')
                    ->required()
                    ->searchable()
                    ->live()
                    ->afterStateUpdated(function ($state, callable $set) {
                        if ($state && ($product = Product::find($state))) {
                            $set('product_name', $product->name);
                        }
                    })
                    ->getSearchResultsUsing(fn (string $search) => Product::query()
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->limit(30)
                        ->pluck('name', 'id')
                        ->toArray())
                    ->getOptionLabelUsing(fn ($value) => Product::find($value)?->name ?? "منتج #{$value}"),

                TextInput::make('product_name')
                    ->label('اسم المنتج (للمرجع)')
                    ->required()
                    ->maxLength(200),

                TextInput::make('max_qty')
                    ->label('الحد الأقصى للكمية في السلة الواحدة')
                    ->numeric()
                    ->required()
                    ->minValue(1)
                    ->helperText('يُطبَّق تلقائياً في الموقع والتطبيق'),
            ])->columns(3),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('woo_product_id')
                    ->label('رقم المنتج')
                    ->sortable(),
                Tables\Columns\TextColumn::make('product_name')
                    ->label('اسم المنتج')
                    ->searchable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('max_qty')
                    ->label('الحد الأقصى')
                    ->badge()
                    ->color('warning')
                    ->sortable(),
                Tables\Columns\TextColumn::make('updated_at')
                    ->label('آخر تعديل')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
            ])
            ->defaultSort('product_name')
            ->actions([
                EditAction::make()->label('تعديل')
                    ->after(fn () => Cache::forget('app_config')),
                DeleteAction::make()->label('حذف')
                    ->after(fn () => Cache::forget('app_config')),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make()->label('حذف المحدد')
                        ->after(fn () => Cache::forget('app_config')),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListProductQtyLimits::route('/'),
            'create' => Pages\CreateProductQtyLimit::route('/create'),
            'edit'   => Pages\EditProductQtyLimit::route('/{record}/edit'),
        ];
    }
}
