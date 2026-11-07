# CraftRace Studio — identidad compartida con SlotRace

Estado de la DEV 0.14.49 (7 noviembre 2026).

## Infraestructura
- Supabase existente: proyecto `TopDown RACE - Craftrace` (sin nuevo proyecto).
- La identidad pertenece a `auth.users.id`, común a TDR y SlotRace cuando se inicia sesión con la misma cuenta real.
- Perfil/canon de apodo: `public.craft_accounts`, con `user_id` y `nickname` único sin distinguir mayúsculas.
- Perfil privado del juego: `public.slotrace_profiles`, con `user_id` que referencia la cuenta CraftRace.
- Ambos recursos tienen RLS de propietario; una cuenta anónima no puede registrar apodo.
- Registro de apodos evita suplantar nicks ya utilizados por un `public.profiles` de TDR con otro `user_id`.
- No se ha modificado `public.profiles`, `public.player_progress` ni los récords de TDR.

## Uso de la PWA
- Entrar en **Menú > Mi cuenta** o **Ajustes > Mi cuenta**.
- Acceso con Google/Apple (requiere proveedores configurados y redirecciones autorizadas) o correo/contraseña.
- Al abrir con una cuenta verificada, el usuario registra su apodo una vez.
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
