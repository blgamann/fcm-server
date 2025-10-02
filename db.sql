CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  fcm_token TEXT UNIQUE NOT NULL,
  nickname VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.ritual (
    id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    default_minutes INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT ritual_pkey PRIMARY KEY (id)
);

CREATE TABLE public.ritual_users (
    ritual_id UUID NOT NULL,
    user_id UUID NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT ritual_users_pkey PRIMARY KEY (ritual_id, user_id),
    CONSTRAINT ritual_users_ritual_id_fkey FOREIGN KEY (ritual_id)
        REFERENCES public.ritual (id) ON DELETE CASCADE,
    CONSTRAINT ritual_users_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE
);