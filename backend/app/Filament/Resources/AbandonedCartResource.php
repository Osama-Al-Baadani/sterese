<?php

namespace App\Filament\Resources;

use App\Filament\Resources\AbandonedCartResource\Pages;
use App\Models\AbandonedCart;
use Filament\Infolists\Components\ImageEntry;
use Filament\Infolists\Components\RepeatableEntry;
use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Actions\Action;
use Filament\Actions\ViewAction;
use Filament\Actions\DeleteAction;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\Http;

class AbandonedCartResource extends Resource
{
    protected static ?string $model = AbandonedCart::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-shopping-cart';
    protected static ?string $navigationLabel = 'السلال المهجورة';
    protected static ?string $pluralModelLabel = 'السلال المهجورة';
    protected static ?string $modelLabel       = 'سلة مهجورة';
    protected static ?int    $navigationSort   = 4;

    public static function infolist(Schema $infolist): Schema
    {
        return $infolist->schema([
            Section::make('بيانات العميل')->schema([
                TextEntry::make('name')
                    ->label('الاسم')
                    ->default('—'),

                TextEntry::make('phone')
                    ->label('الجوال')
                    ->copyable()
                    ->copyMessage('تم نسخ الرقم'),

                TextEntry::make('total')
                    ->label('إجمالي السلة')
                    ->formatStateUsing(fn ($state) => number_format((float)$state, 2) . ' ر.س'),
                TextEntry::make('status')
                    ->label('الحالة')
                    ->badge()
                    ->formatStateUsing(fn ($state) => match($state) {
                        'new'       => 'جديدة',
                        'contacted' => 'تم التواصل',
                        'converted' => 'تحولت لطلب',
                        'lost'      => 'خسرناها',
                        default     => $state,
                    })
                    ->color(fn ($state) => match($state) {
                        'new'       => 'warning',
                        'contacted' => 'info',
                        'converted' => 'success',
                        'lost'      => 'danger',
                        default     => 'gray',
                    }),

                TextEntry::make('contacted_at')
                    ->label('تاريخ التواصل')
                    ->formatStateUsing(fn ($state) => $state ? $state->diffForHumans() : '—'),

                TextEntry::make('woo_order_id')
                    ->label('رقم الطلب')
                    ->default('—')
                    ->url(fn ($record) => $record->woo_order_id
                        ? 'https://storeseco.com/wp-admin/post.php?post=' . $record->woo_order_id . '&action=edit'
                        : null)
                    ->openUrlInNewTab(),

                TextEntry::make('created_at')
                    ->label('منذ')
                    ->since(),

                TextEntry::make('customer_woo_link')
                    ->label('صفحة العميل بالموقع')
                    ->state(fn ($record) => 'عرض طلبات العميل ←')
                    ->url(fn ($record) => 'https://storeseco.com/wp-admin/admin.php?page=wc-orders&s=' . urlencode($record->phone))
                    ->openUrlInNewTab()
                    ->color('primary'),

                // Carts are recorded before checkout, so there's no real
                // address for THIS cart yet — this is only the customer's
                // last saved address from a previous order, shown as a
                // rough hint, never as this cart's confirmed destination.
                TextEntry::make('last_known_address')
                    ->label('آخر موقع معروف (تقريبي)')
                    ->default('لا يوجد عنوان محفوظ سابقًا')
                    ->columnSpanFull(),
            ])->columns(2),

            Section::make('المنتجات')->schema([
                RepeatableEntry::make('cart_items')->label('')->schema([
                    ImageEntry::make('image')
                        ->label('الصورة')
                        ->height(64)
                        ->width(64)
                        ->defaultImageUrl('https://storeseco.com/wp-content/themes/woodmart/images/empty-prod-img.png'),

                    TextEntry::make('name')
                        ->label('اسم المنتج')
                        ->weight(\Filament\Support\Enums\FontWeight::SemiBold),

                    TextEntry::make('sku')
                        ->label('الباركود')
                        ->default('—')
                        ->copyable()
                        ->copyMessage('تم نسخ الباركود'),

                    TextEntry::make('qty')
                        ->label('الكمية')
                        ->default('1'),

                    TextEntry::make('price')
                        ->label('السعر')
                        ->formatStateUsing(fn ($state) => $state ? number_format((float)$state, 2) . ' ر.س' : '—'),
                ])->columns(5),
            ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn ($query) => $query->with([
                'addresses' => fn ($q) => $q->orderByDesc('is_default')->orderByDesc('created_at'),
            ]))
            ->columns([
                TextColumn::make('name')
                    ->label('الاسم')
                    ->searchable()
                    ->default('غير معروف'),

                TextColumn::make('phone')
                    ->label('الجوال')
                    ->searchable()
                    ->copyable()
                    ->copyMessage('تم نسخ الرقم'),

                TextColumn::make('total')
                    ->label('إجمالي السلة')
                    ->formatStateUsing(fn ($state) => number_format($state, 2) . ' ر.س')
                    ->sortable(),

                TextColumn::make('cart_items')
                    ->label('المنتجات')
                    ->formatStateUsing(function ($state) {
                        $items = is_array($state) ? $state : json_decode($state, true);
                        if (empty($items)) return '—';
                        $lines = array_map(
                            fn($i) => ($i['qty'] ?? 1) . '× ' . ($i['name'] ?? ''),
                            array_slice($items, 0, 3)
                        );
                        $more = count($items) > 3 ? ' (+' . (count($items) - 3) . ')' : '';
                        return implode("\n", $lines) . $more;
                    })
                    ->wrap(),

                TextColumn::make('status')
                    ->label('الحالة')
                    ->badge()
                    ->formatStateUsing(fn ($state) => match($state) {
                        'new'       => 'جديدة',
                        'contacted' => 'تم التواصل',
                        'converted' => 'تحولت لطلب',
                        'lost'      => 'خسرناها',
                        default     => 'جديدة',
                    })
                    ->color(fn ($state) => match($state) {
                        'new'       => 'warning',
                        'contacted' => 'info',
                        'converted' => 'success',
                        'lost'      => 'danger',
                        default     => 'warning',
                    }),

                TextColumn::make('created_at')
                    ->label('منذ')
                    ->since()
                    ->sortable(),

                TextColumn::make('reminded_at')
                    ->label('إشعار التذكير')
                    ->badge()
                    ->formatStateUsing(fn ($state) => $state ? 'تم الإرسال' : 'لم يُرسل بعد')
                    ->color(fn ($state) => $state ? 'success' : 'gray'),

                TextColumn::make('last_known_address')
                    ->label('آخر موقع معروف (تقريبي)')
                    ->default('—')
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->limit(40),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label('الحالة')
                    ->options([
                        'new'       => 'جديدة',
                        'contacted' => 'تم التواصل',
                        'converted' => 'تحولت لطلب',
                        'lost'      => 'خسرناها',
                    ]),
            ])
            ->actions([
                ViewAction::make()->label('عرض'),

                Action::make('print')
                    ->label('فاتورة')
                    ->icon('heroicon-o-printer')
                    ->color('gray')
                    ->url(fn (AbandonedCart $record) => url('/abandoned-carts/' . $record->id . '/print'))
                    ->openUrlInNewTab(),

                Action::make('whatsapp')
                    ->label('واتساب')
                    ->icon('heroicon-o-chat-bubble-left-ellipsis')
                    ->color('success')
                    ->url(function (AbandonedCart $record) {
                        $phone = preg_replace('/^0/', '966', $record->phone);
                        $items = is_array($record->cart_items)
                            ? $record->cart_items
                            : json_decode($record->cart_items, true);
                        $itemList = implode('، ', array_map(
                            fn($i) => ($i['name'] ?? '') . ' ×' . ($i['qty'] ?? 1),
                            $items ?? []
                        ));
                        $msg = "مرحباً {$record->name}،\n"
                            . "لاحظنا أنك أضفت منتجات لسلتك بقيمة "
                            . number_format($record->total, 2) . " ر.س ولم تكمل الطلب.\n"
                            . ($itemList ? "المنتجات: {$itemList}\n" : '')
                            . "أكمل طلبك من هنا: https://storeseco.com/app/cart\n"
                            . "هل يمكنني مساعدتك في إتمام الطلب؟ 😊";
                        return 'https://wa.me/' . $phone . '?text=' . rawurlencode($msg);
                    })
                    ->openUrlInNewTab()
                    ->after(function (AbandonedCart $record) {
                        if ($record->status === AbandonedCart::STATUS_NEW) {
                            $record->update([
                                'status'       => AbandonedCart::STATUS_CONTACTED,
                                'contacted_at' => now(),
                            ]);
                        }
                    }),

                Action::make('convert')
                    ->label('تحويل لطلب')
                    ->icon('heroicon-o-check-circle')
                    ->color('primary')
                    ->visible(fn (AbandonedCart $r) => $r->status !== AbandonedCart::STATUS_CONVERTED)
                    ->form([
                        Select::make('payment_method')
                            ->label('طريقة الدفع')
                            ->options([
                                'cod'           => 'كاش عند الاستلام',
                                'bank_transfer' => 'تحويل بنكي',
                            ])
                            ->required(),
                        TextInput::make('address')
                            ->label('العنوان')
                            ->placeholder('يحدد لاحقاً'),
                        TextInput::make('city')
                            ->label('المدينة')
                            ->default('الرياض'),
                        Textarea::make('notes')
                            ->label('ملاحظات')
                            ->rows(2),
                    ])
                    ->action(function (AbandonedCart $record, array $data) {
                        $items = is_array($record->cart_items)
                            ? $record->cart_items
                            : json_decode($record->cart_items, true);

                        $lineItems = collect($items)
                            ->map(fn($i) => [
                                'product_id' => (int) ($i['product_id'] ?? $i['id'] ?? 0),
                                'quantity'   => (int) ($i['qty'] ?? $i['quantity'] ?? 1),
                            ])
                            ->filter(fn($i) => $i['product_id'] > 0)
                            ->values()
                            ->toArray();

                        if (empty($lineItems)) {
                            Notification::make()->title('لا توجد منتجات صالحة')->danger()->send();
                            return;
                        }

                        $paymentTitle = $data['payment_method'] === 'cod' ? 'الدفع عند الاستلام' : 'تحويل بنكي';

                        $body = [
                            'status'               => 'pending',
                            'payment_method'       => $data['payment_method'],
                            'payment_method_title' => $paymentTitle,
                            'set_paid'             => false,
                            'billing' => [
                                'first_name' => $record->name ?: 'عميل',
                                'phone'      => $record->phone,
                                'address_1'  => $data['address'] ?: 'يحدد لاحقاً',
                                'city'       => $data['city'] ?: 'الرياض',
                                'state'      => 'SA',
                                'country'    => 'SA',
                            ],
                            'line_items'    => $lineItems,
                            'customer_note' => 'محوّل من سلة مهجورة'
                                . ($data['notes'] ? ' — ' . $data['notes'] : ''),
                            'meta_data' => [
                                ['key' => '_source', 'value' => 'abandoned_cart_recovery'],
                            ],
                        ];

                        $wooKey    = config('services.woocommerce.key');
                        $wooSecret = config('services.woocommerce.secret');
                        $wooUrl    = rtrim(config('services.woocommerce.url'), '/');

                        // See App\Support\OriginHttp — same-server
                        // PHP->WooCommerce requests get a flat 403 from
                        // this host; shell `curl` is unaffected.
                        $response = new \App\Support\OriginHttpResponse(\App\Support\OriginHttp::post(
                            "{$wooUrl}/wp-json/wc/v3/orders",
                            $body,
                            basicAuth: [$wooKey, $wooSecret],
                            timeout: 20,
                        ));

                        if (!$response->successful()) {
                            Notification::make()->title('فشل إنشاء الطلب')->danger()->send();
                            return;
                        }

                        $wooOrderId = $response->json('id');
                        $record->update([
                            'status'       => AbandonedCart::STATUS_CONVERTED,
                            'woo_order_id' => $wooOrderId,
                        ]);

                        Notification::make()
                            ->title('تم إنشاء الطلب #' . $wooOrderId . ' بنجاح')
                            ->success()
                            ->send();
                    }),

                Action::make('mark_lost')
                    ->label('خسرناها')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->visible(fn (AbandonedCart $r) => !in_array($r->status, [AbandonedCart::STATUS_CONVERTED, AbandonedCart::STATUS_LOST]))
                    ->requiresConfirmation()
                    ->action(fn (AbandonedCart $record) => $record->update(['status' => AbandonedCart::STATUS_LOST])),

                DeleteAction::make()->label('حذف'),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make()->label('حذف المحدد'),
                ]),
            ])
            ->defaultSort('created_at', 'desc')
            ->emptyStateHeading('لا توجد سلال مهجورة')
            ->emptyStateDescription('ستظهر هنا سلات العملاء الذين لم يكملوا الطلب')
            ->emptyStateIcon('heroicon-o-shopping-cart');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListAbandonedCarts::route('/'),
            'view'  => Pages\ViewAbandonedCart::route('/{record}'),
        ];
    }
}
