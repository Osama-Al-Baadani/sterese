<?php

namespace App\Filament\Resources;

use App\Filament\Resources\TagResource\Pages;
use App\Models\Tag;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ToggleColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class TagResource extends Resource
{
    protected static ?string $model = Tag::class;

    protected static string|\BackedEnum|null $navigationIcon   = 'heroicon-o-hashtag';
    protected static ?string                 $navigationLabel  = 'الوسوم (Tags)';
    protected static \UnitEnum|string|null   $navigationGroup  = 'كتالوج المتجر';
    protected static ?int                    $navigationSort   = 4;
    protected static ?string                 $modelLabel       = 'وسم';
    protected static ?string                 $pluralModelLabel = 'الوسوم';

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->withCount('products');
    }

    public static function form(Schema $form): Schema
    {
        return $form->components([
            Section::make('بيانات الوسم')->schema([
                Grid::make(2)->schema([
                    TextInput::make('name')
                        ->label('اسم الوسم (عربي)')
                        ->required()
                        ->maxLength(300)
                        ->placeholder('مثال: عروض نهاية الأسبوع'),

                    TextInput::make('name_en')
                        ->label('اسم الوسم (إنجليزي — اختياري)')
                        ->maxLength(300)
                        ->placeholder('Example: Weekend Deals'),

                    TextInput::make('slug')
                        ->label('الرابط المختصر (Slug)')
                        ->maxLength(300)
                        ->placeholder('يُولَّد تلقائياً إن تُرك فارغاً'),

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
                TextColumn::make('id')
                    ->label('#')
                    ->sortable()
                    ->width(60),

                TextColumn::make('name')
                    ->label('الوسم')
                    ->description(fn (Tag $record) => $record->name_en ?: $record->slug)
                    ->searchable(['name', 'name_en', 'slug'])
                    ->sortable()
                    ->weight('bold'),

                TextColumn::make('products_count')
                    ->label('المنتجات المرتبطة')
                    ->sortable()
                    ->badge()
                    ->color(fn ($state) => $state > 0 ? 'success' : 'gray'),

                ToggleColumn::make('is_active')
                    ->label('مفعّل'),
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
            'index'  => Pages\ListTags::route('/'),
            'create' => Pages\CreateTag::route('/create'),
            'edit'   => Pages\EditTag::route('/{record}/edit'),
        ];
    }
}
