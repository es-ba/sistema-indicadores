 
ALTER TABLE indicadores ALTER COLUMN nohabilitados TYPE jsonb[] USING null::json[];
 

CREATE OR REPLACE FUNCTION indicadores_variables_sincro_delete_trg()
  RETURNS trigger AS
$BODY$
declare
  v_indicador           RECORD;
  v_ind                 text;
begin
    v_indicador=OLD;
    v_ind= v_indicador.indicador;
    DELETE FROM indicadores_variables where indicador= v_ind;
    return OLD; 
end;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
  
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
          new.es_automatico
        );
      INSERT INTO cortes_celdas
        SELECT new.indicador, new.cortes, key as variable, value as valor_corte
          FROM jsonb_each_text(new.cortes);
    end if;
    if TG_OP = 'UPDATE' then 
      UPDATE celdas 
        SET --indicador = new.indicador,
            valor = new.valor,
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
  LANGUAGE plpgsql VOLATILE
  security definer;

-- Function: valores_validar_trg()

-- DROP FUNCTION valores_validar_trg();

CREATE OR REPLACE FUNCTION valores_validar_trg()
  RETURNS trigger AS
$BODY$
declare
  v_new_value jsonb;
  v_new_values jsonb;
  v_column text;
  v_es_variable integer;
  variable_indicador text;
begin
  v_new_values:=to_jsonb(new);
  for v_column in SELECT jsonb_object_keys(v_new_values) 
    loop
      v_es_variable=0;
      SELECT 1 into v_es_variable
        FROM variables
        WHERE corte = TRUE AND variable=v_column;
      if coalesce(v_es_variable,0)=1 then
        SELECT variable
          into variable_indicador 
          FROM indicadores_variables
          WHERE indicador = new.indicador AND variable = v_column;
        v_new_value=v_new_values -> v_column;      
        if jsonb_typeof(v_new_value) is distinct FROM 'null' AND v_column is distinct FROM variable_indicador then
            raise 'Según indicador %, no tiene que haber valor para la variable %',new.indicador, v_column  ; 
        end if;
      end if;
    end loop;
  return new;
end;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

  
DROP SCHEMA IF EXISTS comun CASCADE;
CREATE SCHEMA comun;
GRANT USAGE ON SCHEMA comun TO public;
CREATE OR REPLACE FUNCTION comun.es_numero(valor text)
  RETURNS boolean AS
$BODY$
DECLARE
  valor_numerico double precision;
BEGIN
  valor_numerico:=valor::double precision;
  RETURN true;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN false;
END;
$BODY$
  LANGUAGE plpgsql IMMUTABLE
  COST 100;

--CREATE TABLE totales_calculados(
--  indicador text NOT NULL,
--  cortante jsonb,
--  corte jsonb,
--  valor_sum text,
--  CONSTRAINT totales_calculados_pkey PRIMARY KEY (indicador, corte)
--);

--grant select on "totales_calculados" to "sigba_user";


CREATE OR REPLACE VIEW diferencia_totales AS 
  SELECT x.val,x.val_cal, i.denominacion,x.indicador,x.cortes FROM (
      SELECT v.valor val , tc.valor_sum val_cal,v.indicador, v.cortes FROM valores v INNER JOIN (
          SELECT valor_sum,indicador, corte FROM totales_calculados 
      ) tc ON tc.indicador=v.indicador AND tc.corte=v.cortes WHERE es_automatico IS FALSE
  ) x LEFT JOIN indicadores i ON i.indicador= x. indicador WHERE val<>val_cal ;

--grant select on "diferencia_totales" to "sigba_user";

CREATE OR REPLACE FUNCTION cargar_totales()
  RETURNS integer AS
$BODY$
DECLARE
   str_pre_insert    TEXT;
   str_for_insert    TEXT;
   param_total  RECORD;
   key  TEXT;
   VALUE  TEXT;
   columnas TEXT[]:= '{}';
   valores TEXT[];
   filas_insertadas int := 0;
   i int;
BEGIN
  str_pre_insert='INSERT INTO valores (indicador, valor,cortes, cortantes,es_automatico, #columnas) 
                               VALUES (#indicador, #valor, #cortes, #cortantes,true, #valores)';
  FOR param_total in 
    select tc.indicador indicador, corte, cortante, tc.valor_sum valor
        from totales_calculados tc 
        left join valores v on tc.indicador=v.indicador and tc.corte=v.cortes 
        where v.indicador is  null and cortes is null
        order by tc.indicador, v.indicador
  LOOP
    FOR key,value IN SELECT * FROM jsonb_each_text(param_total.corte)
    LOOP 
      columnas=array_append(columnas, quote_ident(key));
      valores=array_append(valores,quote_literal(value));
    END LOOP;
    str_for_insert=replace(str_pre_insert,'#columnas',array_to_string(columnas,','));
    str_for_insert=replace(str_for_insert,'#indicador',quote_literal(param_total.indicador));
    str_for_insert=replace(str_for_insert,'#valores',array_to_string(valores,','));
    str_for_insert=replace(str_for_insert,'#valor',quote_literal(param_total.valor));
    str_for_insert=replace(str_for_insert,'#cortes',quote_literal(param_total.corte));
    str_for_insert=replace(str_for_insert,'#cortantes',quote_literal(param_total.cortante));
    EXECUTE str_for_insert;
    GET DIAGNOSTICS i= ROW_COUNT;
    filas_insertadas=filas_insertadas+i;
    columnas:='{}';
    valores:='{}';
  END LOOP;
  return filas_insertadas;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION subsets_list(_arr anyarray)
  RETURNS TABLE (sets anyarray) LANGUAGE plpgsql AS
$BODY$
BEGIN
    IF array_upper(_arr, 1) IS NULL THEN
        sets := _arr; RETURN NEXT; RETURN;
    END IF;
    CASE array_upper(_arr, 1)
    WHEN 1 THEN
        RETURN QUERY VALUES ('{}'), (_arr);
    WHEN 2 THEN
        RETURN QUERY VALUES ('{}'), (_arr[1:1]), (_arr), (_arr[2:2]);
    ELSE
        RETURN QUERY
        WITH x AS (
            SELECT f.sets FROM subsets_list(_arr[1:array_upper(_arr, 1)-1]) f
            )
        SELECT x.sets FROM x
        UNION ALL
        SELECT x.sets || _arr[array_upper(_arr, 1)] FROM x;
    END CASE;
END
$BODY$;
  
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
  valorAInsertar   text;
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
        str_sum='select  #agrupacion, sum( case when comun.es_numero(valor) then valor::decimal else 0 end) total, 
                 sum( case when valor=''...'' then 1 else 0 end) npuntos, 
                 sum( case when valor=''-''   then 1 else 0 end) nguiones, 
                 sum( case when valor=''///'' then 1 else 0 end) nbarras, 
                 sum( case when valor=''0''   then 1 else 0 end) nceros, 
                 sum( case when valor<>''///'' and valor<>''...'' and not comun.es_numero(valor) and valor<>''-'' then 1 else 0 end) otros,
                 count(*) cantidadregistros,
                 string_agg(valor,'','') valoresraros 
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
                IF registro.nbarras=registro.cantidadregistros THEN  valorAInsertar='///';
                ELSIF registro.nceros=registro.cantidadregistros OR registro.nguiones=registro.cantidadregistros THEN  valorAInsertar='-';
                ELSIF registro.nbarras+registro.npuntos=registro.cantidadregistros THEN valorAInsertar='...';
                ELSIF (registro.npuntos>=0 AND registro.nbarras>=0 AND registro.otros=0 AND 
                    registro.nguiones<registro.cantidadregistros AND registro.nceros<registro.cantidadregistros) THEN valorAInsertar=registro.total;
                ELSE valorAInsertar=registro.valoresraros; END IF;
                INSERT into  totales_calculados (indicador, cortante, corte, valor_sum) VALUES (v_indcortante.indicador, cortante,corte,valorAInsertar);   
            END LOOP;

        END LOOP;
    END LOOP;        
   SELECT count(*) INTO filas_calculadas  FROM totales_calculados;
   RETURN filas_calculadas;
end;
$BODY$
  LANGUAGE plpgsql VOLATILE;
  
  

-- Trigger: indicadores_variables_sincro_delete_trg on indicadores

-- DROP TRIGGER indicadores_variables_sincro_delete_trg ON indicadores;

CREATE TRIGGER indicadores_variables_sincro_delete_trg
  BEFORE DELETE
  ON indicadores
  FOR EACH ROW
  EXECUTE PROCEDURE indicadores_variables_sincro_delete_trg();

CREATE TRIGGER valores_cortes_before_trg
  BEFORE INSERT OR UPDATE
  ON valores
  FOR EACH ROW
  EXECUTE PROCEDURE valores_cortes_trg();

CREATE TRIGGER valores_cortes_after_trg
  AFTER INSERT OR UPDATE
  ON valores
  FOR EACH ROW
  EXECUTE PROCEDURE valores_cortes_trg();


-- Trigger: valores_validar_trg on valores

-- DROP TRIGGER valores_validar_trg ON valores;

CREATE TRIGGER valores_validar_trg
  BEFORE INSERT OR UPDATE
  ON valores
  FOR EACH ROW
  EXECUTE PROCEDURE valores_validar_trg();

----------------------------------------------------------------------

-- Function: syncro_tabulados()

-- DROP FUNCTION syncro_tabulados();


CREATE OR REPLACE FUNCTION syncro_tabulados()
  RETURNS integer AS 
$BODY$
declare
  tabIn integer;
begin
  with tabuladosInsertados  as( 
    insert into tabulados(indicador, cortantes,habilitado)
        select indicador, cortantes,true
        from celdas
        where  cortantes is distinct from '{}' and (indicador,cortantes) not in (select indicador,cortantes from tabulados)
        group by indicador, cortantes 
        order by indicador, cortantes
        returning 1
  ) select count(*) into tabIn from tabuladosInsertados;
       -- returning indicador into test;--indicador, cortantes;
  update  tabulados tt 
    set invalido=true 
    from ( select indicador,cortantes from tabulados where (indicador,cortantes) not in (select indicador,cortantes from celdas)) t
    where t.indicador=tt.indicador and t.cortantes=tt.cortantes;
       -- returning tt.indicador,tt.cortantes;
  update  tabulados tt 
    set invalido=false 
    from ( select indicador,cortantes from tabulados where invalido = true and (indicador,cortantes) in (select indicador,cortantes from celdas)) t
    where t.indicador=tt.indicador and t.cortantes=tt.cortantes;
       
  return tabIn;
end;
$BODY$
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
--ALTER FUNCTION syncro_tabulados()
--  OWNER TO sigba_owner;
----------------------------------------------------------------------
--ALTER TABLE tabulados_variables
--DROP  CONSTRAINT "tabulados_variables tabulados REL ";
ALTER TABLE tabulados_variables
ADD CONSTRAINT "tabulados_variables tabulados REL " FOREIGN KEY (indicador, cortantes)
      REFERENCES tabulados (indicador, cortantes) MATCH SIMPLE
      ON UPDATE CASCADE ON DELETE CASCADE;
----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION tabulados_variables_syncro_trg()
  RETURNS trigger AS
$BODY$
begin
    insert into tabulados_variables (indicador,cortantes,variable)
        select indicador,cortantes,jsonb_object_keys(cortantes) from tabulados WHERE  indicador=new.indicador and cortantes=new.cortantes;
    return new;
end;
$BODY$
  LANGUAGE plpgsql  /*SECURITY DEFINER*/;
--ALTER FUNCTION tabulados_variables_syncro_trg()
--  OWNER TO sigba_owner;
  
----------------------------------------------------------------------


    CREATE TRIGGER tabulados_variables_syncro_trg
  AFTER INSERT
  ON tabulados
  FOR EACH ROW
  EXECUTE PROCEDURE tabulados_variables_syncro_trg();
  
  
DROP FUNCTION IF EXISTS agregar_quitar_variables();

CREATE OR REPLACE FUNCTION agregar_quitar_variables()
  RETURNS TEXT AS
$BODY$
DECLARE
   estado_variable  RECORD;
BEGIN
  FOR estado_variable IN
      SELECT v.estado_tabla_valores,v.variable FROM variables v
  LOOP
    IF estado_variable.estado_tabla_valores='nueva' THEN 
      EXECUTE format('ALTER TABLE valores ADD COLUMN %I TEXT',estado_variable.variable);
      UPDATE variables 
        SET estado_tabla_valores=NULL 
        WHERE variable=estado_variable.variable;
    END IF;
    IF estado_variable.estado_tabla_valores='quitar' THEN
      BEGIN
        EXECUTE format('ALTER TABLE valores DROP COLUMN %I',estado_variable.variable);
      EXCEPTION
        WHEN undefined_column THEN 
          -- ok! la variable seguramente era nueva y se borró, no se llegó a agregar nunca
        WHEN OTHERS THEN 
          RAISE;
      END;
      DELETE FROM variables v 
        WHERE v.variable=estado_variable.variable;
    END IF;
  END LOOP;
  return 'OK';
END;
$BODY$
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER
  COST 100;
--ALTER FUNCTION agregar_quitar_variables()
--  OWNER TO sigba_owner;

