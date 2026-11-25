<?php

namespace App\Filament\Resources;

use App\Filament\Resources\BrowseSectionResource\Pages;
use App\Models\BrowseSection;
use App\Models\Category;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class BrowseSectionResource extends Resource
{
    protected static ?string $model = BrowseSection::class;

    protected static string|\BackedEnum|null $navigationIcon   = 'heroicon-o-rectangle-group';
    protected static ?string                 $navigationLabel  = 'أقسام شاشة التصفح';
    protected static \UnitEnum|string|null   $navigationGroup  = 'واجهة المتجر والتطبيق';
    protected static ?int                    $navigationSort   = 4;
    protected static ?string                 $modelLabel       = 'قسم تصفح';
    protected static ?string                 $pluralModelLabel = 'أقسام شاشة التصفح';

    public static function form(Schema $form): Schema
    {
        return $form->components([
            Grid::make(2)->schema([
                Select::make('parent_category_id')
                    ->label('التصنيف الرئيسي')
                    ->required()
                    ->searchable()
                    ->preload()
                    ->options(fn () => Category::orderBy('name')->pluck('name', 'id')->toArray()),

                TextInput::make('title')
                    ->label('عنوان مخصص (اختياري)')
                    ->maxLength(100)
                    ->placeholder('اتركه فارغاً لاستخدام اسم التصنيف تلقائياً'),
            ]),

            Select::make('sub_category_ids')
                ->label('التصنيفات الفرعية المعروضة')
                ->helperText('اتركه فارغاً لعرض كل التصنيفات الفرعية تلقائياً')
                ->multiple()
                ->searchable()
                ->preload()
                ->options(fn () => Category::orderBy('name')->pluck('name', 'id')->toArray()),

            Grid::make(2)->schema([
                TextInput::make('sort_order')
                    ->label('ترتيب العرض')
                    ->numeric()
                    ->default(0),

                Toggle::make('visible')
                    ->label('مرئي في التطبيق')
                    ->default(true),
            ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('sort_order')->label('#')->sortable()->width(50),
                TextColumn::make('parent_category_id')
                    ->label('التصنيف الرئيسي')
                    ->formatStateUsing(fn ($state) => Category::find($state)?->name ?? "قسم #{$state}"),
                TextColumn::make('title')
                    ->label('عنوان مخصص')
                    ->placeholder('تلقائي'),
                TextColumn::make('sub_category_ids')
                    ->label('التصنيفات الفرعية')
                    ->formatStateUsing(fn ($state) => (!is_array($state) || empty($state)) ? 'تلقائي (كل الأبناء)' : count($state) . ' تصنيف فرعي'),
                IconColumn::make('visible')->label('مرئي')->boolean(),
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
            'index'  => Pages\ListBrowseSections::route('/'),
            'create' => Pages\CreateBrowseSection::route('/create'),
            'edit'   => Pages\EditBrowseSection::route('/{record}/edit'),
        ];
    }
}
