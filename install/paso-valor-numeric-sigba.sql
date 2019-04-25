set role to sigba_owner;
set search_path=sigba;

alter table valores add column valor_esp text;
alter table valores add column valor_ant text;

insert into indicadores_variables (indicador,variable) values ('tip_viol_gen_porc', 'desagr')

update valores set valor_ant=valor;
update valores set valor=null;

alter table valores drop CONSTRAINT "la columna valor no debe contener comas";
DROP VIEW diferencia_totales;
alter table totales_calculados alter column valor_sum type numeric USING valor_sum::numeric;



ALTER TABLE valores
    ALTER COLUMN valor TYPE numeric USING valor::numeric;

CREATE OR REPLACE VIEW diferencia_totales AS 
 SELECT x.val,
    x.val_cal,
    i.denominacion,
    x.indicador,
    x.cortes
   FROM ( SELECT v.valor AS val,
            tc.valor_sum AS val_cal,
            v.indicador,
            v.cortes
           FROM valores v
             JOIN ( SELECT totales_calculados.valor_sum,
                    totales_calculados.indicador,
                    totales_calculados.corte
                   FROM totales_calculados) tc ON tc.indicador = v.indicador AND tc.corte = v.cortes
          WHERE v.es_automatico IS FALSE) x
     LEFT JOIN indicadores i ON i.indicador = x.indicador
  WHERE x.val <> x.val_cal;

ALTER TABLE diferencia_totales
  OWNER TO sigba_owner;

  
  alter table celdas add column valor_esp text;

  ALTER TABLE celdas
    ALTER COLUMN valor TYPE numeric USING valor::numeric;
    
    
CREATE OR REPLACE FUNCTION valores_cortes_trg()
  RETURNS trigger AS
$BODY$
declare
  v_new_value jsonb;
  v_new_values jsonb;
  v_column text;
  v_cortes jsonb;
  v_cortantes jsonb;
  v_cartel text;
  es_corte boolean;
  v_nuevo jsonb;
begin
  v_new_values:=CASE WHEN TG_OP='DELETE' then '{}'::jsonb ELSE to_jsonb(new) END;
  v_cartel='';
  v_cortes=v_new_values;
  v_cortantes=v_new_values;
  for v_column in select jsonb_object_keys(v_new_values) 
    loop
      v_new_value=v_new_values -> v_column;
      select corte  into es_corte
          from variables
          where variable=v_column::text;  
      if not( jsonb_typeof(v_new_value)= 'null') and v_new_value is distinct from '"tcaba"'::jsonb 
        and es_corte 
      then  
          v_cortantes= jsonb_set(v_cortantes,array[v_column],to_jsonb(true),false);
      else  
          v_cortes =v_cortes - v_column;
          v_cortantes= v_cortantes - v_column;
      end if;
    end loop;
  new.cortes=v_cortes;
  new.cortantes= v_cortantes;
  IF TG_WHEN = 'AFTER' then 
    if TG_OP = 'INSERT' then 
      INSERT INTO celdas 
        VALUES (
          new.indicador,
          new.cortes,
          new.valor,
          new.cv,
          new.num,
          new.dem,
          new.cortantes,
          new.usu_validacion,
          new.fecha_validacion,
          new.origen_validacion,
          new.es_automatico,
          new.valor_esp                     
        );
      INSERT INTO cortes_celdas
        SELECT new.indicador, new.cortes, key as variable, value as valor_corte
          FROM jsonb_each_text(new.cortes);
    end if;
    if TG_OP = 'UPDATE' then 
      UPDATE celdas 
        SET --indicador = new.indicador,
            valor = new.valor,
            valor_esp = new.valor_esp,
            cv = new.cv,
            num = new.num,
            dem = new.dem,
            --cortes = new.cortes,
            cortantes = new.cortantes,
            usu_validacion = new.usu_validacion,
            fecha_validacion = new.fecha_validacion,
            origen_validacion = new.origen_validacion,
            es_automatico = new.es_automatico
        WHERE indicador = new.indicador
          AND cortes = new.cortes;
      DELETE FROM cortes_celdas
        WHERE indicador = old.indicador AND cortes = old.cortes 
          AND variable IN (select jsonb_object_keys(old.cortantes) EXCEPT select jsonb_object_keys(new.cortantes));  /* los cortes que ya no estén (delete old.cortantes - new.cortantes)*/
      INSERT INTO cortes_celdas
        SELECT new.indicador, new.cortes, nuevos.var_name, new.cortes ->> nuevos.var_name
        FROM (select jsonb_object_keys(new.cortantes) as var_name EXCEPT select jsonb_object_keys(old.cortantes) as var_name) as nuevos; /* los cortes nuevos */
      UPDATE cortes_celdas
        SET 
            valor_corte =  new.cortes ->> modificados.var_name
          FROM (select jsonb_object_keys(new.cortantes) as var_name INTERSECT select jsonb_object_keys(old.cortantes) as var_name) as modificados
        WHERE indicador = old.indicador AND cortes = old.cortes AND variable = modificados.var_name ; /* los cortes con valor_corte modificado */
    end if;
  end if;
  return new; 
end;
$BODY$
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER
  COST 100;
ALTER FUNCTION valores_cortes_trg()
  OWNER TO sigba_owner;

  UPDATE valores v set valor=x.val from (
select valor_ant, case when comun.es_numero(valor_ant) is true then valor_ant::numeric else null end val from valores 
) x
where v.valor_ant=x.valor_ant;


UPDATE valores v set valor_esp=x.val from (
select valor_ant, case when comun.es_numero(valor_ant) is false then valor_ant else null end val from valores 
) x
where v.valor_ant=x.valor_ant;


alter table totales_calculados add column valor_sum_esp text;

CREATE OR REPLACE FUNCTION valores_totales()
  RETURNS integer AS
$BODY$
declare
  v_indcortante     RECORD;
  str_sum             text;
  str_sum_agru        text;
  registro                record;
  ragrup            record;
  unSet             record;
  v_column     text;
  cortante       jsonb;
  corte         jsonb;
  filas_calculadas int;
  valorAInsertar   numeric;
  valorAInsertar_esp   text;
  v_quoted_set     text[];
begin
    delete from totales_calculados;
    FOR v_indcortante IN
        with setsTotales as (
            select v.indicador, v.key,iv.ctrl_totales from (
                select indicador, key
                from valores , lateral jsonb_each_text(cortantes)
                group by indicador, key
                order by indicador, key
            ) v left join indicadores_variables iv on iv.indicador=v.indicador and iv.variable=v.key WHERE ctrl_totales='s'
        )select indicador, count(*) cantvar, jsonb_object_agg(key , true) cortantevar, array_agg(key)arr_var
    from setsTotales group by 1 order by 1
    LOOP
        str_sum='select  #agrupacion, sum( case when valor is not null then valor else 0 end) total, 
                 sum( case when valor_esp=''...'' then 1 else 0 end) npuntos, 
                 sum( case when valor_esp=''-''   then 1 else 0 end) nguiones, 
                 sum( case when valor_esp=''///'' then 1 else 0 end) nbarras, 
                 sum( case when valor=0   then 1 else 0 end) nceros, 
                 sum( case when valor_esp<>''///'' and valor_esp<>''...'' and valor_esp<>''-'' then 1 else 0 end) otros,
                 count(*) cantidadregistros,
                 string_agg(valor_esp,'','') valoresraros 
              from valores 
              WHERE indicador=$1 AND cortantes = $2
              group by #agrupacion
              order by #agrupacion';   
        FOR unSet IN  SELECT sets FROM subsets_list(v_indcortante.arr_var) as sets
           where sets <> '{}' AND array_upper(sets, 1)<v_indcortante.cantvar 
               and sets @> ARRAY['annio']
           ORDER BY 1
        LOOP
            select array_agg(quote_ident(ident)) into v_quoted_set
              from unnest(unSet.sets) ident;
            str_sum_agru= replace(str_sum,'#agrupacion',array_to_string(v_quoted_set,','));
            FOR registro IN EXECUTE str_sum_agru USING v_indcortante.indicador, v_indcortante.cortantevar
            LOOP
                cortante='{}';
                corte='{}';
                FOREACH v_column IN ARRAY unSet.sets 
                LOOP
                    cortante=cortante||jsonb_build_object(v_column,to_jsonb(true));
                END LOOP;
                corte=to_jsonb(registro)-'total'-'nbarras'-'npuntos'-'otros'-'valoresraros'-'cantidadregistros'-'nceros'-'nguiones';
                IF registro.nbarras=registro.cantidadregistros THEN  valorAInsertar_esp='///';
                ELSIF registro.nceros=registro.cantidadregistros OR registro.nguiones=registro.cantidadregistros THEN  valorAInsertar_esp='-';
                ELSIF registro.nbarras+registro.npuntos=registro.cantidadregistros THEN valorAInsertar='...';
                ELSIF (registro.npuntos>=0 AND registro.nbarras>=0 AND registro.otros=0 AND 
                    registro.nguiones<registro.cantidadregistros AND registro.nceros<registro.cantidadregistros) THEN valorAInsertar=registro.total;
                ELSE valorAInsertar_esp=registro.valoresraros; END IF;
                INSERT into  totales_calculados (indicador, cortante, corte, valor_sum,valor_sum_esp) VALUES (v_indcortante.indicador, cortante,corte,valorAInsertar,valorAInsertar_esp);   
            END LOOP;

        END LOOP;
    END LOOP;        
   SELECT count(*) INTO filas_calculadas  FROM totales_calculados;
   RETURN filas_calculadas;
end;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
ALTER FUNCTION valores_totales()
  OWNER TO sigba_owner;

  
  alter table valores drop column valor_ant;
  
  
GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE totales_calculados TO sigba_owner;
GRANT SELECT ON TABLE diferencia_totales TO sigba_owner;

GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE diferencia_totales TO sigba_owner;
GRANT SELECT ON TABLE diferencia_totales TO sigba_owner;

DELETE FROM variables WHERE variable='valor';

DROP VIEW diferencia_totales;

CREATE OR REPLACE VIEW diferencia_totales AS 
 SELECT x.val,
    x.val_cal,
    x.val_esp,
    x.val_cal_esp,
    i.denominacion,
    x.indicador,
    x.cortes
   FROM ( SELECT 
            v.valor          AS val,
            v.valor_esp      AS val_esp,
            tc.valor_sum     AS val_cal,
            tc.valor_sum_esp AS val_cal_esp,
            v.indicador,
            v.cortes
           FROM valores v
             JOIN ( SELECT totales_calculados.valor_sum,
                    totales_calculados.valor_sum_esp,
                    totales_calculados.indicador,
                    totales_calculados.corte
                   FROM totales_calculados) tc ON tc.indicador = v.indicador AND tc.corte = v.cortes
          WHERE v.es_automatico IS FALSE) x
     LEFT JOIN indicadores i ON i.indicador = x.indicador
  WHERE x.val <> x.val_cal OR x.val_esp <> x.val_cal_esp;

ALTER TABLE diferencia_totales
  OWNER TO sigba_owner;
GRANT ALL ON TABLE diferencia_totales TO sigba_owner;
GRANT SELECT ON TABLE diferencia_totales TO sigba_user;