<?php

namespace App\Filament\Resources;

use App\Filament\Resources\BannerResource\Pages;
use App\Models\Banner;
use App\Models\BrandSetting;
use App\Models\Category;
use App\Models\Tag;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Cache;

class BannerResource extends Resource
{
    protected static ?string $model = Banner::class;

    protected static string|\BackedEnum|null $navigationIcon   = 'heroicon-o-photo';
    protected static ?string                 $navigationLabel  = 'البنرات والكاردات';
    protected static \UnitEnum|string|null   $navigationGroup  = 'واجهة المتجر والتطبيق';
    protected static ?string                 $modelLabel       = 'بنر';
    protected static ?string                 $pluralModelLabel = 'البنرات';
    protected static ?int                    $navigationSort   = 1;

    public static function form(Schema $form): Schema
    {
        return $form->components([
            Section::make('نوع ومكان ظهور البنر')->schema([
                Select::make('type')
                    ->label('النوع')
                    ->options([
                        'carousel'     => '📱 بنر رئيسي للتطبيق (Carousel)',
                        'web_carousel' => '🌐 بنر رئيسي للموقع الإلكتروني (Web Hero Carousel)',
                        'grid_tile'    => '🌐 بطاقة شبكية بالموقع (Grid Tile)',
                        'grid_stack'   => '🌐 بنر جانبي مكدس بالموقع (Grid Stack)',
                        'promo'        => '🃏 كارد صغير علوي — مشترك للتطبيق والموقع',
                        'promo_bottom' => '🎁 كارد سفلي — مشترك للتطبيق والموقع',
                    ])
                    ->default('carousel')
                    ->required()
                    ->live(),
            ]),

            Section::make('صورة البنر')->schema([
                FileUpload::make('image_path')
                    ->label('ارفع صورة')
                    ->image()
                    ->disk('public')
                    ->directory('banners')
                    ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp'])
                    ->maxSize(3072)
                    ->columnSpanFull(),

                TextInput::make('external_url')
                    ->label('أو رابط صورة خارجي (اختياري)')
                    ->url()
                    ->placeholder('https://...')
                    ->helperText('إذا رفعت صورة أعلاه اتركه فارغاً')
                    ->columnSpanFull(),
            ]),

            Section::make('نص الكارد الصغير')->schema([
                TextInput::make('title_ar')
                    ->label('العنوان')
                    ->placeholder('مثال: وصل حديثاً')
                    ->maxLength(60),
                TextInput::make('subtitle_ar')
                    ->label('النص الفرعي')
                    ->placeholder('مثال: أحدث المنتجات بأسعار تنافسية')
                    ->maxLength(100),
            ])
            ->columns(2)
            ->visible(fn ($get) => in_array($get('type'), ['promo', 'promo_bottom'])),

            Section::make('الرابط عند الضغط')->schema([
                Select::make('link_type')
                    ->label('نوع الرابط')
                    ->options([
                        'none'           => 'بدون رابط',
                        'category'       => 'قسم فرعي (يعرض منتجاته مباشرة)',
                        'classification' => 'تصنيف رئيسي (يعرض أقسامه الفرعية ومنتجاته)',
                        'brand'          => 'براند',
                        'tag'            => 'وسم (Tag)',
                        'search'         => 'بحث عن كلمة',
                    ])
                    ->default('none')
                    ->live()
                    ->afterStateUpdated(fn (callable $set) => $set('link_value', null))
                    ->required(),

                Select::make('link_value')
                    ->label(fn ($get) => match ($get('link_type')) {
                        'brand' => 'اختر البراند',
                        'tag'   => 'اختر الوسم',
                        default => 'اختر القسم / التصنيف',
                    })
                    ->searchable()
                    ->preload()
                    ->options(fn ($get) => match ($get('link_type')) {
                        'brand' => BrandSetting::orderBy('name')->pluck('name', 'slug')->toArray(),
                        'tag'   => Tag::orderBy('name')->pluck('name', 'id')->mapWithKeys(fn ($n, $id) => [(string) $id => $n])->toArray(),
                        default => Category::with('parent')
                            ->orderByRaw('CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END ASC')
                            ->orderBy('name')
                            ->get()
                            ->mapWithKeys(fn (Category $c) => [
                                (string) $c->id => $c->parent ? "↳ {$c->name} ({$c->parent->name})" : "📁 {$c->name} (رئيسي)",
                            ])
                            ->toArray(),
                    })
                    ->visible(fn ($get) => in_array($get('link_type'), ['category', 'classification', 'brand', 'tag'], true))
                    ->dehydrated(fn ($get) => in_array($get('link_type'), ['category', 'classification', 'brand', 'tag'], true)),

                TextInput::make('link_value')
                    ->label('كلمة البحث')
                    ->placeholder('مثال: جبنة موزاريلا')
                    ->visible(fn ($get) => $get('link_type') === 'search')
                    ->dehydrated(fn ($get) => $get('link_type') === 'search'),
            ])->columns(2),

            Section::make('الإعدادات')->schema([
                TextInput::make('sort_order')
                    ->label('الترتيب')
                    ->numeric()
                    ->default(0)
                    ->minValue(0),

                Toggle::make('is_active')
                    ->label('مفعّل')
                    ->default(true),
            ])->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('image_url')
                    ->label('الصورة')
                    ->height(45)
                    ->width(110),

                Tables\Columns\TextColumn::make('type')
                    ->label('النوع')
                    ->formatStateUsing(fn ($state) => match ($state) {
                        'web_carousel' => 'بنر موقع (Hero)',
                        'grid_tile'    => 'بطاقة موقع (Tile)',
                        'grid_stack'   => 'بنر جانبي (Stack)',
                        'promo'        => 'كارد علوي',
                        'promo_bottom' => 'كارد سفلي',
                        default        => 'بنر تطبيق',
                    })
                    ->badge()
                    ->color(fn ($state) => match ($state) {
                        'web_carousel', 'grid_tile', 'grid_stack' => 'primary',
                        'promo'                                   => 'warning',
                        'promo_bottom'                            => 'success',
                        default                                   => 'info',
                    }),

                Tables\Columns\TextColumn::make('title_ar')
                    ->label('العنوان')
                    ->default('—'),

                Tables\Columns\TextColumn::make('link_type')
                    ->label('الرابط')
                    ->formatStateUsing(fn ($state) => match ($state) {
                        'category'       => 'قسم فرعي',
                        'classification' => 'تصنيف رئيسي',
                        'search'         => 'بحث',
                        'brand'          => 'براند',
                        'tag'            => 'وسم',
                        default          => '—',
                    })
                    ->badge(),

                Tables\Columns\TextColumn::make('sort_order')->label('الترتيب')->sortable(),
                Tables\Columns\IconColumn::make('is_active')->label('مفعّل')->boolean(),
                Tables\Columns\TextColumn::make('updated_at')->label('آخر تعديل')->dateTime('d/m/Y H:i')->sortable(),
            ])
            ->defaultSort('sort_order')
            ->reorderable('sort_order')
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
            'index'  => Pages\ListBanners::route('/'),
            'create' => Pages\CreateBanner::route('/create'),
            'edit'   => Pages\EditBanner::route('/{record}/edit'),
        ];
    }
}
