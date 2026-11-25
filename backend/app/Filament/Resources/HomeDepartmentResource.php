<?php

namespace App\Filament\Resources;

use App\Filament\Resources\HomeDepartmentResource\Pages;
use App\Models\Category;
use App\Models\HomeDepartment;
use App\Models\Tag;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class HomeDepartmentResource extends Resource
{
    protected static ?string $model = HomeDepartment::class;

    protected static string|\BackedEnum|null $navigationIcon   = 'heroicon-o-squares-2x2';
    protected static ?string                 $navigationLabel  = 'أيقونات الأقسام بالرئيسية';
    protected static \UnitEnum|string|null   $navigationGroup  = 'واجهة المتجر والتطبيق';
    protected static ?int                    $navigationSort   = 3;
    protected static ?string                 $modelLabel       = 'أيقونة قسم';
    protected static ?string                 $pluralModelLabel = 'أيقونات الأقسام بالرئيسية';

    public static function form(Schema $form): Schema
    {
        return $form->components([
            Select::make('source_type')
                ->label('نوع الأيقونة')
                ->options([
                    'category' => 'قسم من المتجر',
                    'tag'      => 'وسم (Tag)',
                ])
                ->default('category')
                ->required()
                ->live(),

            Select::make('category_id')
                ->label(fn ($get) => $get('source_type') === 'tag' ? 'اختر الوسم (Tag)' : 'اختر القسم')
                ->required()
                ->searchable()
                ->preload()
                ->options(fn ($get) => $get('source_type') === 'tag'
                    ? Tag::orderBy('name')->pluck('name', 'id')->toArray()
                    : Category::with('parent')
                        ->orderByRaw('CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END ASC')
                        ->orderBy('name')
                        ->get()
                        ->mapWithKeys(fn (Category $c) => [
                            $c->id => $c->parent ? "↳ {$c->name} ({$c->parent->name})" : "📁 {$c->name} (رئيسي)",
                        ])
                        ->toArray()),

            Grid::make(2)->schema([
                TextInput::make('title')
                    ->label('عنوان مخصص للأيقونة (اختياري للقسم / إلزامي للوسم)')
                    ->required(fn ($get) => $get('source_type') === 'tag')
                    ->maxLength(50),

                TextInput::make('icon')
                    ->label('أيقونة (Emoji — اختياري)')
                    ->maxLength(10)
                    ->placeholder('مثال: 🌿'),
            ]),

            Grid::make(2)->schema([
                FileUpload::make('image_path')
                    ->label('ارفع صورة مخصصة (اختياري)')
                    ->image()
                    ->disk('public')
                    ->directory('home-department-icons')
                    ->maxSize(1024),

                TextInput::make('external_url')
                    ->label('أو رابط صورة خارجي (اختياري)')
                    ->url()
                    ->maxLength(500),
            ]),

            Grid::make(2)->schema([
                TextInput::make('sort_order')
                    ->label('ترتيب العرض')
                    ->numeric()
                    ->default(0),

                Toggle::make('visible')
                    ->label('مرئي في المتجر والتطبيق')
                    ->default(true),
            ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('sort_order')->label('#')->sortable()->width(50),
                ImageColumn::make('icon_image_url')->label('')->circular()->width(36)->height(36),
                TextColumn::make('source_type')
                    ->label('النوع')
                    ->formatStateUsing(fn ($state) => $state === 'tag' ? 'وسم' : 'قسم')
                    ->badge(),
                TextColumn::make('category_id')
                    ->label('القسم / الوسم')
                    ->formatStateUsing(function ($state, $record) {
                        if ($record->source_type === 'tag') {
                            $name = Tag::find($state)?->name ?? "وسم #{$state}";
                            return ($record->icon ? $record->icon . ' ' : '') . ($record->title ?: $name);
                        }
                        return $record->title ?: (Category::find($state)?->name ?? "قسم #{$state}");
                    }),
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
            'index'  => Pages\ListHomeDepartments::route('/'),
            'create' => Pages\CreateHomeDepartment::route('/create'),
            'edit'   => Pages\EditHomeDepartment::route('/{record}/edit'),
        ];
    }
}
