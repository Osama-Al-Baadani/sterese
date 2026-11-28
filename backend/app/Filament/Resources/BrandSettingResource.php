<?php

namespace App\Filament\Resources;

use App\Filament\Resources\BrandSettingResource\Pages;
use App\Models\BrandSetting;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class BrandSettingResource extends Resource
{
    protected static ?string $model = BrandSetting::class;

    protected static string|\BackedEnum|null $navigationIcon   = 'heroicon-o-bookmark-square';
    protected static ?string                 $navigationLabel  = 'البراندات (الماركات)';
    protected static \UnitEnum|string|null   $navigationGroup  = 'كتالوج المتجر';
    protected static ?string                 $modelLabel       = 'براند';
    protected static ?string                 $pluralModelLabel = 'البراندات';
    protected static ?int                    $navigationSort   = 3;

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->withCount('products');
    }

    public static function form(Schema $form): Schema
    {
        return $form->components([
            Section::make('معلومات البراند')->schema([
                Grid::make(2)->schema([
                    TextInput::make('name')
                        ->label('اسم البراند (عربي)')
                        ->required()
                        ->maxLength(300),

                    TextInput::make('name_en')
                        ->label('اسم البراند (إنجليزي — اختياري)')
                        ->maxLength(300),

                    TextInput::make('slug')
                        ->label('الرابط المختصر (Slug)')
                        ->maxLength(300)
                        ->placeholder('يُولَّد تلقائياً إن تُرك فارغاً'),

                    TextInput::make('product_count')
                        ->label('عدد المنتجات الافتراضي (في حال عدم ربط منتجات محلياً بعد)')
                        ->numeric()
                        ->default(0),
                ]),

                Grid::make(2)->schema([
                    FileUpload::make('image_path')
                        ->label('ارفع شعار البراند')
                        ->image()
                        ->disk('public')
                        ->directory('brands')
                        ->maxSize(10240),

                    TextInput::make('image_url')
                        ->label('أو رابط شعار خارجي (اختياري)')
                        ->url()
                        ->placeholder('https://...'),
                ]),
            ]),

            Section::make('الإعدادات')->schema([
                TextInput::make('sort_order')
                    ->label('الترتيب (الأصغر يظهر أولاً)')
                    ->numeric()
                    ->default(0),

                Toggle::make('is_active')
                    ->label('يظهر في المتجر والتطبيق')
                    ->default(true),
            ])->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('resolved_image')
                    ->label('الشعار')
                    ->circular()
                    ->height(44)
                    ->width(44),

                Tables\Columns\TextColumn::make('name')
                    ->label('البراند')
                    ->description(fn (BrandSetting $r) => $r->name_en ?: $r->slug)
                    ->searchable(['name', 'name_en', 'slug'])
                    ->sortable()
                    ->weight('bold'),

                Tables\Columns\TextColumn::make('products_count')
                    ->label('المنتجات المرتبطة')
                    ->formatStateUsing(fn ($state, BrandSetting $r) => max((int) $state, (int) $r->product_count))
                    ->sortable()
                    ->badge()
                    ->color(fn ($state, BrandSetting $r) => max((int) $state, (int) $r->product_count) > 0 ? 'success' : 'gray'),

                Tables\Columns\TextColumn::make('sort_order')
                    ->label('الترتيب')
                    ->sortable(),

                Tables\Columns\ToggleColumn::make('is_active')
                    ->label('مفعّل'),
            ])
            ->defaultSort('sort_order')
            ->reorderable('sort_order')
            ->actions([
                EditAction::make()->label('تعديل'),
                DeleteAction::make()->label('حذف'),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListBrandSettings::route('/'),
            'create' => Pages\CreateBrandSetting::route('/create'),
            'edit'   => Pages\EditBrandSetting::route('/{record}/edit'),
        ];
    }
}
