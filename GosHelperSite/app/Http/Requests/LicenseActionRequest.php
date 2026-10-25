<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
class LicenseActionRequest extends FormRequest { public function authorize():bool{return true;} protected function prepareForValidation():void{$this->merge(['license_key'=>strtoupper(trim((string)$this->license_key))]);} public function rules():array{return ['license_key'=>['required','string','max:80','regex:/^VGH-[A-Z0-9-]+$/'],'device_id'=>['required','string','max:255'],'device_name'=>['required','string','max:100'],'platform'=>['required','in:windows'],'app_version'=>['nullable','string','max:30']];} }
