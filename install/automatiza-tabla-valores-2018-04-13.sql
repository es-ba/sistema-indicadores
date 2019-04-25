SET ROLE sigba_owner;
SET search_path=sigba;

ALTER TABLE variables ADD COLUMN estado_tabla_valores TEXT;
ALTER TABLE variables ADD CONSTRAINT "valor invalido en estado_variable" CHECK (estado_tabla_valores=ANY (ARRAY['nueva'::TEXT,'quitar'::TEXT]));
alter table variables alter column "estado_tabla_valores" set default 'nueva';
alter table variables alter column "corte" set default true;

delete from cortes where variable in ('um', 'fte');
delete from variables where variable in ('um', 'fte');

ALTER TABLE sigba.cortes DROP CONSTRAINT cortes_variable_fkey;
alter table "cortes" add constraint "cortes variables REL" foreign key ("variable") references "variables" ("variable")  on delete cascade on update cascade;
alter table "indicadores_variables" drop constraint  "indicadores_variables_variable_fkey";
alter table "indicadores_variables" add constraint  "indicadores_variables variables REL" foreign key ("variable") references "variables" ("variable")  on update cascade;
alter table "indicadores_variables" drop constraint  "indicadores_variables_indicador_fkey";
alter table "indicadores_variables" add constraint  "indicadores_variables indicador REL" foreign key ("indicador") references "indicadores" ("indicador")  on update cascade;


DROP FUNCTION IF EXISTS sigba.agregar_quitar_variables();

CREATE OR REPLACE FUNCTION sigba.agregar_quitar_variables()
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
ALTER FUNCTION sigba.agregar_quitar_variables()
  OWNER TO sigba_owner;

