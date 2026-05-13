create extension if not exists pgcrypto;

create table if not exists public.applicants (
  id uuid primary key default gen_random_uuid(),
  ref_id text not null unique,
  first_name text not null,
  surname text not null,
  email text,
  id_number text not null unique,
  contact_number text not null,
  gender text not null,
  race text not null,
  area text not null,
  area_other text,
  address_notes text,
  skills text[] not null default '{}',
  skills_other text,
  packhouse_experience boolean not null default false,
  forklift_licence boolean not null default false,
  work_shift text,
  status text not null default 'new',
  placement_site text,
  admin_notes text,
  id_copy_url text,
  proof_sars_url text,
  proof_bank_url text,
  payslip_url text,
  forklift_doc_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applicants_area_check check (area in ('Uitenhage', 'Kirkwood', 'Addo', 'Other')),
  constraint applicants_status_check check (status in ('new', 'reviewed', 'shortlisted', 'placed', 'rejected')),
  constraint applicants_id_number_check check (char_length(id_number) = 13)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

DROP TRIGGER IF EXISTS applicants_set_updated_at ON public.applicants;
create trigger applicants_set_updated_at
before update on public.applicants
for each row
execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('applicant-docs', 'applicant-docs', true)
on conflict (id) do nothing;

-- This app uses the Supabase service role on the server.
-- If you later switch to browser-direct storage or database reads,
-- add the required RLS policies before doing that.
