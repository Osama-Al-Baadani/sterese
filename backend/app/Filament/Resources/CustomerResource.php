<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CustomerResource\Pages;
use App\Models\Customer;
use Filament\Actions\DeleteAction;
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

class CustomerResource extends Resource
{
    protected static ?string $model = Customer::class;

    protected static string|\BackedEnum|null $navigationIcon   = 'heroicon-o-users';
    protected static ?string                 $navigationLabel  = 'العملاء والمحافظ';
    protected static \UnitEnum|string|null   $navigationGroup  = 'العملاء والطلبات';
    protected static ?int                    $navigationSort   = 3;
    protected static ?string                 $modelLabel       = 'عميل';
    protected static ?string                 $pluralModelLabel = 'العملاء';

    public static function form(Schema $form): Schema
    {
        return $form->components([
            Section::make('البيانات الشخصية')->schema([
                Grid::make(2)->schema([
                    TextInput::make('first_name')
                        ->label('الاسم الأول')
                        ->maxLength(150),

                    TextInput::make('last_name')
                        ->label('الاسم الأخير')
                        ->maxLength(150),

                    TextInput::make('phone')
                        ->label('رقم الجوال')
                        ->required()
                        ->unique(ignoreRecord: true)
                        ->maxLength(30)
                        ->placeholder('05xxxxxxxx'),

                    TextInput::make('email')
                        ->label('البريد الإلكتروني (اختياري)')
                        ->email()
                        ->maxLength(255),
                ]),
            ]),

            Section::make('المحفظة والحساب')->schema([
                Grid::make(3)->schema([
                    TextInput::make('wallet_balance')
                        ->label('رصيد المحفظة (ر.س)')
                        ->numeric()
                        ->minValue(0)
                        ->default(0)
                        ->suffix('ر.س'),

                    TextInput::make('password')
                        ->label('كلمة مرور جديدة (اختياري)')
                        ->password()
                        ->dehydrated(fn ($state) => filled($state))
                        ->helperText('اتركها فارغة إذا كان العميل يسجل عبر رمز التحقق OTP'),

                    Toggle::make('is_active')
                        ->label('الحساب نشط')
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

                TextColumn::make('first_name')
                    ->label('العميل')
                    ->formatStateUsing(fn ($state, Customer $r) => trim($r->first_name . ' ' . $r->last_name) ?: 'بدون اسم')
                    ->searchable(['first_name', 'last_name'])
                    ->weight('bold'),

                TextColumn::make('phone')
                    ->label('رقم الجوال')
                    ->searchable()
                    ->copyable(),

                TextColumn::make('wallet_balance')
                    ->label('رصيد المحفظة')
                    ->money('SAR')
                    ->sortable()
                    ->badge()
                    ->color(fn ($state) => (float) $state > 0 ? 'success' : 'gray'),

                ToggleColumn::make('is_active')
                    ->label('نشط'),

                TextColumn::make('created_at')
                    ->label('تاريخ التسجيل')
                    ->dateTime('d/m/Y')
                    ->sortable(),
            ])
            ->defaultSort('id', 'desc')
            ->actions([
                EditAction::make()->label('تعديل'),
                DeleteAction::make()->label('حذف'),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListCustomers::route('/'),
            'create' => Pages\CreateCustomer::route('/create'),
            'edit'   => Pages\EditCustomer::route('/{record}/edit'),
        ];
    }
}
