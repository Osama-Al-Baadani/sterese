<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PolicyResource\Pages;
use App\Models\Policy;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Cache;

class PolicyResource extends Resource
{
    protected static ?string $model = Policy::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-document-text';
    protected static ?string $navigationLabel  = 'السياسات';
    protected static ?string $modelLabel       = 'سياسة';
    protected static ?string $pluralModelLabel = 'السياسات';
    protected static ?int    $navigationSort   = 6;

    public static function form(Schema $form): Schema
    {
        return $form->components([
            Section::make('معلومات السياسة')->schema([
                Select::make('type')
                    ->label('نوع السياسة')
                    ->options([
                        'return'  => 'سياسة الإرجاع والاستبدال',
                        'privacy' => 'سياسة الخصوصية',
                        'terms'   => 'الشروط والأحكام',
                    ])
                    ->required()
                    ->disabled(fn ($record) => $record !== null),

                TextInput::make('title')
                    ->label('العنوان')
                    ->required()
                    ->maxLength(100),
            ])->columns(2),

            Section::make('الأقسام')->schema([
                Repeater::make('sections')
                    ->label('')
                    ->schema([
                        TextInput::make('heading')
                            ->label('عنوان القسم')
                            ->required()
                            ->maxLength(100),
                        Textarea::make('body')
                            ->label('محتوى القسم')
                            ->required()
                            ->rows(4)
                            ->helperText('يمكن استخدام • للنقاط و \n للأسطر الجديدة'),
                    ])
                    ->columns(1)
                    ->addActionLabel('إضافة قسم')
                    ->reorderable()
                    ->columnSpanFull(),
            ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('type')
                    ->label('النوع')
                    ->formatStateUsing(fn ($state) => match ($state) {
                        'return'  => 'سياسة الإرجاع',
                        'privacy' => 'سياسة الخصوصية',
                        'terms'   => 'الشروط والأحكام',
                        default   => $state,
                    })
                    ->badge()
                    ->color(fn ($state) => match ($state) {
                        'return'  => 'warning',
                        'privacy' => 'info',
                        'terms'   => 'success',
                        default   => 'gray',
                    }),
                Tables\Columns\TextColumn::make('title')->label('العنوان'),
                Tables\Columns\TextColumn::make('sections')
                    ->label('عدد الأقسام')
                    ->formatStateUsing(fn ($state) => count($state ?? []) . ' أقسام'),
                Tables\Columns\TextColumn::make('updated_at')
                    ->label('آخر تعديل')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
            ])
            ->actions([
                EditAction::make()->label('تعديل')
                    ->after(fn () => Cache::forget('app_config')),
            ])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListPolicies::route('/'),
            'create' => Pages\CreatePolicy::route('/create'),
            'edit'   => Pages\EditPolicy::route('/{record}/edit'),
        ];
    }
}
