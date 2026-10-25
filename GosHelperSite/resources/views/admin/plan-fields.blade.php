<div class="form-grid">
    <label><span>Slug</span><input name="slug" value="{{ $plan->slug }}" required></label><label><span>Название</span><input name="name" value="{{ $plan->name }}" required></label>
    <label class="wide"><span>Описание</span><textarea name="description">{{ $plan->description }}</textarea></label>
    <label><span>Цена / месяц, ₽</span><input type="number" step="0.01" min="0" name="price_monthly" value="{{ $plan->exists ? $plan->price_monthly/100 : 0 }}"></label>
    <label><span>Цена / год, ₽</span><input type="number" step="0.01" min="0" name="price_yearly" value="{{ $plan->exists ? $plan->price_yearly/100 : 0 }}"></label>
    <label><span>Валюта</span><input name="currency" value="{{ $plan->currency ?: 'RUB' }}" maxlength="3"></label><label><span>Пробный период</span><input type="number" min="0" name="trial_days" value="{{ $plan->trial_days ?: 0 }}"></label><label><span>Лимит устройств</span><input type="number" min="1" name="device_limit" value="{{ $plan->device_limit ?: 1 }}"></label><label><span>Порядок</span><input type="number" min="0" name="sort_order" value="{{ $plan->sort_order ?: 0 }}"></label>
    <label class="wide"><span>Возможности · одна на строку</span><textarea rows="6" name="features">{{ implode("\n",$plan->features ?? []) }}</textarea></label>
</div><label class="switch"><input type="checkbox" name="is_active" value="1" @checked($plan->exists ? $plan->is_active : true)><i></i> Тариф активен</label>
