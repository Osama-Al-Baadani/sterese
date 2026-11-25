<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PaymentResource\Pages;
use App\Models\Payment;
use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Components\Section;
use Filament\Actions\ViewAction;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;

class PaymentResource extends Resource
{
    protected static ?string $model = Payment::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-credit-card';
    protected static ?string $navigationLabel  = 'المدفوعات';
    protected static ?string $modelLabel       = 'دفعة';
    protected static ?string $pluralModelLabel = 'المدفوعات';
    protected static ?int    $navigationSort   = 2;

    public static function form(Schema $form): Schema
    {
        return $form->components([]);
    }

    public static function infolist(Schema $infolist): Schema
    {
        return $infolist->schema([
            Section::make('تفاصيل الدفع')->schema([
                TextEntry::make('order.customer_name')->label('العميل'),
                TextEntry::make('order_id')->label('رقم الطلب'),
                TextEntry::make('paymob_order_id')->label('PayMob Order ID')->default('—'),
                TextEntry::make('paymob_transaction_id')->label('PayMob Transaction ID')->default('—'),
                TextEntry::make('amount')->label('المبلغ')->money('SAR'),
                TextEntry::make('currency')->label('العملة'),
                TextEntry::make('payment_method')->label('طريقة الدفع')->default('—'),
                TextEntry::make('status')->label('الحالة')->badge()
                    ->color(fn (string $state) => match ($state) {
                        'paid'    => 'success',
                        'pending' => 'warning',
                        'failed'  => 'danger',
                        default   => 'gray',
                    }),
                TextEntry::make('error_message')->label('رسالة الخطأ')->default('—'),
                TextEntry::make('created_at')->label('وقت العملية')->dateTime('d/m/Y H:i'),
            ])->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->label('#')->sortable(),
                Tables\Columns\TextColumn::make('order.customer_name')->label('العميل')->searchable(),
                Tables\Columns\TextColumn::make('paymob_transaction_id')->label('Transaction ID')->default('—'),
                Tables\Columns\TextColumn::make('amount')->label('المبلغ')->money('SAR')->sortable(),
                Tables\Columns\TextColumn::make('status')->label('الحالة')->badge()
                    ->color(fn (string $state) => match ($state) {
                        'paid'    => 'success',
                        'pending' => 'warning',
                        'failed'  => 'danger',
                        default   => 'gray',
                    })
                    ->formatStateUsing(fn (string $state) => match ($state) {
                        'paid'    => 'مدفوع',
                        'pending' => 'انتظار',
                        'failed'  => 'فاشل',
                        default   => $state,
                    }),
                Tables\Columns\TextColumn::make('created_at')->label('التاريخ')->dateTime('d/m/Y H:i')->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                Tables\Filters\SelectFilter::make('status')->label('الحالة')
                    ->options(['pending' => 'انتظار', 'paid' => 'مدفوع', 'failed' => 'فاشل']),
            ])
            ->actions([ViewAction::make()->label('عرض')])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPayments::route('/'),
            'view'  => Pages\ViewPayment::route('/{record}'),
        ];
    }
}
