<?php

namespace App\Filament\Resources;

use App\Filament\Resources\OrderResource\Pages;
use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;
use Filament\Infolists\Components\RepeatableEntry;
use Filament\Infolists\Components\TextEntry;
use Filament\Infolists\Components\ImageEntry;
use Filament\Schemas\Components\Section;
use Filament\Actions\ViewAction;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;

class OrderResource extends Resource
{
    protected static ?string $model = Order::class;

    protected static string|\BackedEnum|null $navigationIcon   = 'heroicon-o-shopping-cart';
    protected static ?string                 $navigationLabel  = 'الطلبات';
    protected static \UnitEnum|string|null   $navigationGroup  = 'العملاء والطلبات';
    protected static ?string                 $modelLabel       = 'طلب';
    protected static ?string                 $pluralModelLabel = 'الطلبات';
    protected static ?int                    $navigationSort   = 1;

    public static function form(Schema $form): Schema
    {
        return $form->components([]);
    }

    public static function infolist(Schema $infolist): Schema
    {
        return $infolist->schema([
            Section::make('بيانات العميل')->schema([
                TextEntry::make('customer_name')->label('الاسم'),
                TextEntry::make('customer_phone')->label('الجوال'),
                TextEntry::make('customer_email')->label('الإيميل')->default('—'),
                TextEntry::make('address')->label('العنوان'),
                TextEntry::make('city')->label('المدينة')->default('—'),
            ])->columns(2),

            Section::make('تفاصيل الطلب')->schema([
                TextEntry::make('subtotal_before_tax')->label('قبل الضريبة')->money('SAR'),
                TextEntry::make('tax_amount')->label('الضريبة (15%)')->money('SAR'),
                TextEntry::make('delivery_fee')->label('رسوم التوصيل')->money('SAR'),
                TextEntry::make('discount')->label('الخصم')->money('SAR'),
                TextEntry::make('wallet_amount')->label('مدفوع من المحفظة')->money('SAR'),
                TextEntry::make('cod_fee')->label('رسوم الدفع عند الاستلام')->money('SAR'),
                TextEntry::make('remaining_payment')
                    ->label('المتبقي (بطاقة/عند الاستلام)')
                    ->state(fn ($record) => max(0, (float) $record->total - (float) $record->wallet_amount))
                    ->money('SAR'),
                TextEntry::make('total')->label('بعد الضريبة (الإجمالي)')->money('SAR')->weight('bold'),
                TextEntry::make('status')->label('الحالة')->badge()
                    ->color(fn (string $state) => match ($state) {
                        'paid', 'shipped', 'delivered', 'confirmed' => 'success',
                        'pending'  => 'warning',
                        'failed', 'cancelled' => 'danger',
                        default    => 'gray',
                    })
                    ->formatStateUsing(fn (string $state) => match ($state) {
                        'paid'       => 'مدفوع',
                        'pending'    => 'قيد الانتظار',
                        'failed'     => 'فشل',
                        'shipped'    => 'تم الشحن',
                        'delivered'  => 'تم التسليم',
                        'confirmed'  => 'مؤكد',
                        'cancelled'  => 'ملغي',
                        default      => $state,
                    }),
                TextEntry::make('woo_order_id')->label('رقم WooCommerce')->default('—'),
                TextEntry::make('payment_method')->label('طريقة الدفع')->badge()
                    ->color(fn (?string $state) => match ($state) {
                        'cash_on_delivery' => 'warning',
                        'wallet', 'card'   => 'success',
                        default            => 'gray',
                    })
                    ->formatStateUsing(fn (?string $state) => match ($state) {
                        'cash_on_delivery' => '💵 الدفع عند الاستلام',
                        'wallet'           => 'المحفظة',
                        'card'             => 'بطاقة',
                        default            => '—',
                    }),
                TextEntry::make('notes')->label('ملاحظات')->default('—')->columnSpanFull(),
                TextEntry::make('attribution_source')->label('الجهاز والإصدار')->default('—'),
                TextEntry::make('attribution_media_source')->label('المصدر الإعلاني')->default('عضوي (Organic)'),
                TextEntry::make('attribution_campaign')->label('الحملة الإعلانية')->default('—'),
            ])->columns(2),

            Section::make('المنتجات')->schema([
                RepeatableEntry::make('items')->label('')->schema([
                    ImageEntry::make('image')
                        ->label('الصورة')
                        ->height(70)
                        ->width(70)
                        ->extraImgAttributes(['style' => 'object-fit:cover;border-radius:6px'])
                        ->defaultImageUrl(fn ($state) => $state ?: null),

                    TextEntry::make('name')
                        ->label('اسم المنتج')
                        ->default('—'),

                    TextEntry::make('sku')
                        ->label('SKU')
                        ->default('—')
                        ->copyable()
                        ->formatStateUsing(function ($state, $record) {
                            if (!$state || $state === '—') return '—';
                            $svgId = 'bc-' . preg_replace('/[^a-zA-Z0-9]/', '', $state);
                            return <<<HTML
                                <span style="font-family:monospace;font-size:13px;font-weight:700">{$state}</span><br>
                                <svg id="{$svgId}" data-sku="{$state}" style="margin-top:4px;display:block"></svg>
                            HTML;
                        })
                        ->html(),

                    TextEntry::make('quantity')
                        ->label('الكمية')
                        ->badge()
                        ->color('primary'),

                    TextEntry::make('price')
                        ->label('السعر شامل الضريبة')
                        ->formatStateUsing(fn ($state) => $state ? 'SAR ' . number_format((float) $state, 2) : '—'),
                ])->columns(5),

                // JsBarcode initialization
                TextEntry::make('id')
                    ->label('')
                    ->formatStateUsing(fn () => '')
                    ->html()
                    ->extraAttributes(['class' => 'hidden'])
                    ->helperText(new \Illuminate\Support\HtmlString(
                        '<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>' .
                        '<script>
                        (function initBarcodes() {
                            var svgs = document.querySelectorAll("svg[data-sku]");
                            if (!svgs.length) { setTimeout(initBarcodes, 400); return; }
                            svgs.forEach(function(svg) {
                                var sku = svg.dataset.sku;
                                if (!sku) return;
                                try {
                                    JsBarcode(svg, sku, {
                                        format: (sku.length === 13 && /^\d+$/.test(sku)) ? "EAN13" : "CODE128",
                                        width: 1.4,
                                        height: 40,
                                        displayValue: false,
                                        margin: 2
                                    });
                                } catch(e) {
                                    JsBarcode(svg, sku, { format:"CODE128", width:1.4, height:40, displayValue:false, margin:2 });
                                }
                            });
                        })();
                        </script>'
                    )),
            ]),

            Section::make('بيانات الدفع')->relationship('payment')->schema([
                TextEntry::make('paymob_order_id')->label('PayMob Order ID')->default('—'),
                TextEntry::make('paymob_transaction_id')->label('PayMob Transaction ID')->default('—'),
                TextEntry::make('status')->label('حالة الدفع')->badge()
                    ->color(fn (string $state) => match ($state) {
                        'paid'    => 'success',
                        'pending' => 'warning',
                        'failed'  => 'danger',
                        default   => 'gray',
                    }),
                TextEntry::make('error_message')->label('رسالة الخطأ')->default('—'),
            ])->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->label('#')->sortable(),
                Tables\Columns\TextColumn::make('customer_name')
                    ->label('العميل')
                    ->searchable(),
                Tables\Columns\TextColumn::make('customer_phone')
                    ->label('الجوال')
                    ->searchable(),
                Tables\Columns\TextColumn::make('subtotal_before_tax')->label('قبل الضريبة')->money('SAR'),
                Tables\Columns\TextColumn::make('total')->label('بعد الضريبة (الإجمالي)')->money('SAR')->sortable(),
                Tables\Columns\TextColumn::make('payment_method')->label('طريقة الدفع')->badge()
                    ->color(fn (?string $state) => match ($state) {
                        'cod', 'cash_on_delivery' => 'warning',
                        'wallet', 'card'          => 'success',
                        default                   => 'gray',
                    })
                    ->formatStateUsing(fn (?string $state) => match ($state) {
                        'cod', 'cash_on_delivery' => '💵 الدفع عند الاستلام',
                        'wallet'                  => 'المحفظة',
                        'card'                    => 'بطاقة',
                        default                   => '—',
                    }),
                Tables\Columns\TextColumn::make('status')->label('الحالة')->badge()
                    ->color(fn (string $state) => match ($state) {
                        'paid', 'cod', 'shipped', 'delivered', 'confirmed' => 'success',
                        'pending'             => 'warning',
                        'failed', 'cancelled' => 'danger',
                        default               => 'gray',
                    })
                    ->formatStateUsing(fn (string $state) => match ($state) {
                        'paid'      => 'مدفوع',
                        'cod'       => 'دفع عند الاستلام',
                        'pending'   => 'قيد الانتظار',
                        'failed'    => 'فشل',
                        'shipped'   => 'تم الشحن',
                        'delivered' => 'تم التسليم',
                        'confirmed' => 'مؤكد',
                        'cancelled' => 'ملغي',
                        default     => $state,
                    }),
                Tables\Columns\TextColumn::make('woo_order_id')
                    ->label('WooCommerce')
                    ->searchable()
                    ->sortable(query: fn (Builder $query, string $direction) => $query->orderByRaw("CAST(woo_order_id AS UNSIGNED) $direction"))
                    ->default('—'),
                Tables\Columns\TextColumn::make('attribution_source')
                    ->label('الجهاز')
                    ->default('—')
                    ->searchable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('attribution_media_source')
                    ->label('المصدر الإعلاني')
                    ->badge()
                    ->default('عضوي')
                    ->color(fn (?string $state) => $state ? 'success' : 'gray')
                    ->searchable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('created_at')->label('التاريخ')->dateTime('d/m/Y H:i')->sortable(),
            ])
            // Newest first regardless of woo_order_id — orders awaiting payment
            // confirmation (e.g. the direct PayMob flow) have no woo_order_id
            // yet and would otherwise sort to the last page and go unnoticed.
            ->defaultSort('id', 'desc')
            ->filters([
                Tables\Filters\SelectFilter::make('status')->label('الحالة')
                    ->options([
                        'pending'   => 'قيد الانتظار',
                        'paid'      => 'مدفوع',
                        'shipped'   => 'تم الشحن',
                        'delivered' => 'تم التسليم',
                        'confirmed' => 'مؤكد',
                        'failed'    => 'فشل',
                        'cancelled' => 'ملغي',
                    ]),
                Tables\Filters\SelectFilter::make('payment_method')->label('طريقة الدفع')
                    ->options([
                        'cash_on_delivery' => '💵 الدفع عند الاستلام',
                        'wallet'           => 'المحفظة',
                        'card'             => 'بطاقة',
                    ]),
                Tables\Filters\SelectFilter::make('attribution_media_source')
                    ->label('المصدر الإعلاني')
                    ->options(fn () => Order::query()
                        ->whereNotNull('attribution_media_source')
                        ->distinct()
                        ->orderBy('attribution_media_source')
                        ->pluck('attribution_media_source', 'attribution_media_source')
                        ->toArray()),
            ])
            ->actions([ViewAction::make()->label('عرض')])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListOrders::route('/'),
            'view'  => Pages\ViewOrder::route('/{record}'),
        ];
    }
}
