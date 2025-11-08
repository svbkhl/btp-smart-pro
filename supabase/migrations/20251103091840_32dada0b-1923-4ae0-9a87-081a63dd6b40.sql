-- Create tables for AI features

-- Table for AI-generated quotes
CREATE TABLE public.ai_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_name TEXT,
  surface NUMERIC,
  work_type TEXT,
  materials TEXT[],
  image_urls TEXT[],
  estimated_cost NUMERIC,
  details JSONB,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for maintenance reminders
CREATE TABLE public.maintenance_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  installation_date DATE,
  last_maintenance DATE,
  next_maintenance DATE NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for image analysis results
CREATE TABLE public.image_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  analysis_result JSONB,
  defects_detected TEXT[],
  estimated_repair_cost NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for AI assistant conversations
CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_quotes
CREATE POLICY "Users can view their own quotes" 
ON public.ai_quotes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quotes" 
ON public.ai_quotes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotes" 
ON public.ai_quotes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quotes" 
ON public.ai_quotes FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for maintenance_reminders
CREATE POLICY "Users can view their own reminders" 
ON public.maintenance_reminders FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reminders" 
ON public.maintenance_reminders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders" 
ON public.maintenance_reminders FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders" 
ON public.maintenance_reminders FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for image_analysis
CREATE POLICY "Users can view their own analyses" 
ON public.image_analysis FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses" 
ON public.image_analysis FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policies for ai_conversations
CREATE POLICY "Users can view their own conversations" 
ON public.ai_conversations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" 
ON public.ai_conversations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_ai_quotes_updated_at
BEFORE UPDATE ON public.ai_quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_reminders_updated_at
BEFORE UPDATE ON public.maintenance_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();