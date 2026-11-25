<x-filament-panels::page>
    <form wire:submit="save">
        {{ $this->form }}

        <div class="mt-6 flex flex-wrap gap-3 justify-start">
            <x-filament::button type="submit" size="lg" color="primary">
                💾 حفظ الإعدادات
            </x-filament::button>

            <x-filament::button
                type="button"
                size="lg"
                color="danger"
                wire:click="sendPromoNotification"
                wire:loading.attr="disabled"
            >
                📢 إرسال إشعار العرض للجميع
            </x-filament::button>
        </div>
    </form>
</x-filament-panels::page>
