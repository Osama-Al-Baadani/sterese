<?php

namespace App\Filament\Resources;

use App\Filament\Resources\OfferPageResource\Pages;
use App\Models\OfferPage;
use App\Models\Tag;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Cache;

class OfferPageResource extends Resource
{
    protected static ?string $model = OfferPage::class;

    protected static string|\BackedEnum|null $navigationIcon   = 'heroicon-o-fire';
    protected static ?string                 $navigationLabel  = 'صفحات العروض';
    protected static \UnitEnum|string|null   $navigationGroup  = 'التسويق والعروض';
    protected static ?string                 $modelLabel       = 'صفحة عروض';
    protected static ?string                 $pluralModelLabel = 'صفحات العروض';
    protected static ?int                    $navigationSort   = 2;

    public static function form(Schema $form): Schema
    {
        return $form->components([
            Section::make('بيانات الصفحة')->schema([
                TextInput::make('label')
                    ->label('اسم الصفحة في التطبيق')
                    ->placeholder('مثال: المواد الغذائية')
                    ->required()
                    ->maxLength(60),

                Select::make('tag_id')
                    ->label('اختر الوسم المرتبط بالعرض')
                    ->required()
                    ->searchable()
                    ->preload()
                    ->options(fn () => Tag::orderBy('name')->pluck('name', 'id')->toArray())
                    ->createOptionForm([
                        TextInput::make('name')->label('اسم الوسم')->required(),
                        TextInput::make('name_en')->label('الاسم بالإنجليزي'),
                    ])
                    ->createOptionUsing(fn (array $data) => Tag::create($data)->id),

                Select::make('icon')
                    ->label('الأيقونة')
                    ->options([
                        'shopping_basket_rounded'          => 'سلة — مواد غذائية',
                        'face_retouching_natural_outlined' => 'وجه — عناية',
                        'cleaning_services_outlined'       => 'تنظيف — عناية منزلية',
                        'local_pharmacy_outlined'          => 'صيدلية',
                        'child_care_outlined'              => 'أطفال',
                        'sports_outlined'                  => 'رياضة',
                        'pets_outlined'                    => 'حيوانات أليفة',
                        'local_florist_outlined'           => 'نباتات وزهور',
                    ])
                    ->default('shopping_basket_rounded')
                    ->required(),

                TextInput::make('sort_order')
                    ->label('الترتيب (الأصغر يظهر أولاً)')
                    ->numeric()
                    ->default(0)
                    ->minValue(0),

                Toggle::make('is_active')
                    ->label('مفعّلة')
                    ->default(true),
            ])->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('label')->label('اسم الصفحة')->searchable()->weight('bold'),
                Tables\Columns\TextColumn::make('tag_id')
                    ->label('الوسم')
                    ->formatStateUsing(fn ($state) => Tag::find($state)?->name ?? "وسم #{$state}")
                    ->badge(),
                Tables\Columns\TextColumn::make('sort_order')->label('الترتيب')->sortable(),
                Tables\Columns\IconColumn::make('is_active')->label('مفعّلة')->boolean(),
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
            'index'  => Pages\ListOfferPages::route('/'),
            'create' => Pages\CreateOfferPage::route('/create'),
            'edit'   => Pages\EditOfferPage::route('/{record}/edit'),
        ];
    }
}
