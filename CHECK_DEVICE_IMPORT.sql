-- V6.0.4.4 - controllo read-only dopo import Device
select
  count(*) filter (where source_sheet = 'Device') as righe_asset_device_db,
  count(*) filter (where source_sheet = 'Device' and coalesce(is_label_only,false)=false) as device_reali_db,
  count(*) filter (where source_sheet = 'Device' and coalesce(is_label_only,false)=true) as etichette_libere_db,
  min(source_row) filter (where source_sheet = 'Device') as prima_riga_device,
  max(source_row) filter (where source_sheet = 'Device') as ultima_riga_device
from public.assets;

select
  asset_code,
  source_row,
  category,
  site,
  position,
  assigned_user_name,
  verification_status,
  import_batch
from public.assets
where upper(asset_code) = 'A4076';

select conflict_type, count(*) as gruppi
from public.data_conflicts
where source_type = 'DEVICE' and status = 'APERTO'
group by conflict_type
order by conflict_type;
