# CraftRace Studio — identidad compartida con SlotRace

Estado de la DEV 0.14.50 (7 noviembre 2026).

## Infraestructura
- Supabase existente: proyecto `TopDown RACE - Craftrace` (sin nuevo proyecto).
- La identidad pertenece a `auth.users.id`, común a TDR y SlotRace cuando se inicia sesión con la misma cuenta real.
- Registro global: `public.craft_accounts`, con `user_id` compartido. El apodo (`nickname`) es opcional al principio y único sin distinguir mayúsculas.
- Un trigger privado de `auth.users` inscribe automáticamente a cada nueva identidad permanente; la transición de invitado anónimo a usuario permanente conserva el mismo UUID. No se crean perfiles Studio para invitados anónimos.
- Backfill inicial: la identidad permanente de TDR ya está inscrita como `Juanfrikazo-dev` en Studio. El nick de piloto de TDR `JUANFRIKAZO_DEV` sigue intacto.
- Los juegos comparten **identidad**, no cookies de inicio de sesión ni datos de partidas. Cada juego debe autenticar al usuario con el mismo proveedor de Supabase Auth.
- Perfil privado del juego: `public.slotrace_profiles`, con `user_id` que referencia la cuenta CraftRace.
- Ambos recursos tienen RLS de propietario; una cuenta anónima no puede registrar apodo.
- Registro de apodos evita suplantar nicks ya utilizados por un `public.profiles` de TDR con otro `user_id`.
- No se ha modificado `public.profiles`, `public.player_progress` ni los récords de TDR.

## Uso de la PWA
- Entrar en **Menú > Mi cuenta** o **Ajustes > Mi cuenta**.
- Acceso con Google/Apple (requiere proveedores configurados y redirecciones autorizadas) o correo/contraseña.
- Al abrir con una cuenta verificada, si todavía no tiene apodo Studio, lo reclama una vez; el registro de usuario ya se ha creado automáticamente.
- Desde una cuenta activa se ofrece «Vincular Google» / «Vincular Apple» para añadir proveedores bajo el MISMO UUID mediante `auth.linkIdentity`. Requiere `Allow manual linking` habilitado y URL autorizada.
- El enlace revisa al regresar que tanto el UUID de Auth como el proveedor estén asociados a la identidad original; si no coinciden, se rechaza la sesión.
- Apple con «Ocultar mi correo» puede presentar un correo diferente: la única forma segura de combinarlo con Google es vincularlo **desde dentro de la cuenta ya autenticada**, no iniciar dos registros independientes.
- Si existe `profiles.nick` del mismo UUID en TDR, se propone como nombre inicial, sin reclamarlo automáticamente.
- `Juanfrikazo-dev` no está reservado hasta que el propietario inicie sesión y complete el registro.

## Configuración externa requerida
1. En Supabase Auth > URL Configuration, añadir `https://almaprintes.github.io/SlotRace/` a las Redirect URLs (además de conservar las de TDR).
2. En Supabase Auth > Providers, confirmar la configuración de Google y Apple. Configurar el callback OAuth de Supabase en los respectivos proveedores. **No cambiar a ciegas los ajustes existentes de TDR.**
3. Probar el retorno OAuth en Safari y la PWA instalada del iPhone; en iOS pueden usar almacenes de sesión distintos.
4. Probar alta por correo con los emails de confirmación configurados.

## Datos protegidos
- `slotrace-circuit-library-v1`, `slotrace-lab-10` y sus versiones siguen siendo **locales**.
- No hay todavía copia de circuitos ni récords en la nube; ninguna sesión fuerza restaurar, fusionar, eliminar o subir nada.
- Los perfiles de ambos juegos comparten la identidad, no fusionan automáticamente TDR y SlotRace ni sus partidas.
- La clave incorporada en el cliente es **publishable**. Las claves secretas o `service_role` nunca se publican.
- Las futuras copias en la nube requerirán un flujo explícito de comparación y confirmación del usuario.

## Contrato para futuros juegos

Todos deben usar **el mismo proyecto Supabase Auth**. El backend crea la pertenencia a CraftRace Studio al registrar la identidad permanente; los juegos NO crean otro usuario en su propia base de datos. Cada juego dispone de sus tablas de progreso con FK al mismo `auth.users.id` y RLS propietario. Los proveedores de identidad pueden vincularse de manera verificada desde la cuenta activa. Un nick local, correo escrito por el usuario o nombre de un plano NO prueba propiedad. Nunca se restauran ni mezclan progresos entre juegos sin confirmación explícita.

`Juanfrikazo-dev` pertenece en Studio al UUID autenticado de `JUANFRIKAZO_DEV` de TDR; no se reclamó una identidad nueva.
