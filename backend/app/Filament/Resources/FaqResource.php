<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FaqResource\Pages;
use App\Models\Faq;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Cache;

class FaqResource extends Resource
{
    protected static ?string $model = Faq::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-question-mark-circle';
    protected static ?string $navigationLabel  = 'الأسئلة الشائعة';
    protected static ?string $modelLabel       = 'سؤال';
    protected static ?string $pluralModelLabel = 'الأسئلة الشائعة';
    protected static ?int    $navigationSort   = 5;

    public static function form(Schema $form): Schema
    {
        return $form->components([
            Section::make()->schema([
                Textarea::make('question')
                    ->label('السؤال')
                    ->required()
                    ->rows(2)
                    ->columnSpanFull(),

                Textarea::make('answer')
                    ->label('الجواب')
                    ->required()
                    ->rows(4)
                    ->helperText('يمكن استخدام \n للأسطر الجديدة')
                    ->columnSpanFull(),

                TextInput::make('sort_order')
                    ->label('الترتيب (الأصغر يظهر أولاً)')
                    ->numeric()
                    ->default(0),

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
                Tables\Columns\TextColumn::make('sort_order')
                    ->label('#')
                    ->sortable()
                    ->width(50),
                Tables\Columns\TextColumn::make('question')
                    ->label('السؤال')
                    ->limit(60)
                    ->searchable(),
                Tables\Columns\TextColumn::make('answer')
                    ->label('الجواب')
                    ->limit(50)
                    ->color('gray'),
                Tables\Columns\IconColumn::make('is_active')
                    ->label('مفعّل')
                    ->boolean(),
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
                    DeleteBulkAction::make()->label('حذف المحدد'),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListFaqs::route('/'),
            'create' => Pages\CreateFaq::route('/create'),
            'edit'   => Pages\EditFaq::route('/{record}/edit'),
        ];
    }
}
